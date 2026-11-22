// tiny-stack-vm-01: a strict interpreter of the tiny stack ISA (generator/subject/ISA.md), rule for rule with the
// reference VM generator/subject/vm.mjs. Reads <in>/<id>/{program.bin,input.bin}, writes <out>/<id>/{stdout.bin,exit.txt}.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// One row per opcode: [byte, immediate bytes, popped, pushed]; a byte no row holds stays 255 in IMM (trap 5).
const IMM = new Uint8Array(256).fill(255);
const POPS = new Uint8Array(256);
const PUSH = new Uint8Array(256);
for (const [o, i, p, s] of [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0], [4, 0, 1, 2], [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3],
  [16, 0, 2, 1], [17, 0, 2, 1], [18, 0, 2, 1], [19, 0, 2, 1], [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1], [23, 0, 1, 1],
  [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1], [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1], [32, 0, 2, 1],
  [33, 0, 2, 1], [34, 0, 2, 1], [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0], [52, 0, 0, 0], [64, 0, 1, 1],
  [65, 0, 2, 0], [80, 0, 1, 0], [81, 0, 1, 0], [82, 0, 0, 1], [83, 0, 1, 0],
]) {
  IMM[o] = i;
  POPS[o] = p;
  PUSH[o] = s;
}

// One program to its end: what it wrote and the code it ended on (a trap's code, output written before it kept).
function run(p: Uint8Array, input: Uint8Array): { out: Uint8Array; exit: number } {
  const n = p.length;
  const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536), dec = new Uint8Array(12);
  let sp = 0, csp = 0, olen = 0, inPos = 0, pc = 0, steps = 0, code = 0;
  loop: for (;;) {
    if (steps === 1000000) { code = 10; break; } // step limit
    if (pc < 0 || pc >= n) { code = 9; break; } // pc outside the program
    const op = p[pc], imm = IMM[op];
    if (imm === 255) { code = 5; break; } // unknown opcode
    if (pc + imm >= n) { code = 9; break; } // immediate cut off by the end
    steps++;
    const pops = POPS[op];
    if (sp < pops) { code = 2; break; } // underflow
    if (sp - pops + PUSH[op] > 256) { code = 3; break; } // overflow
    const nx = pc + 1 + imm;
    pc = nx;
    switch (op) {
      case 0x00: code = 0; break loop; // HALT
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 0x02: D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break; // PUSH32
      case 0x03: sp--; break; // POP
      case 0x04: D[sp] = D[sp - 1]; sp++; break; // DUP
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; } // SWAP
      case 0x06: D[sp] = D[sp - 2]; sp++; break; // OVER
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; } // ROT
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break; // NEG, wraps
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break; // NOT
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        switch (op) {
          case 0x10: r = (a + b) | 0; break; // ADD, wraps
          case 0x11: r = (a - b) | 0; break; // SUB, wraps
          case 0x12: r = Math.imul(a, b); break; // MUL, the exact product's low 32 bits
          case 0x13: if (b === 0) { code = 4; break loop; } r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break; // DIV: signed, toward zero
          case 0x14: if (b === 0) { code = 4; break loop; } r = b === -1 ? 0 : a % b | 0; break; // MOD: the sign of a
          case 0x15: if (b === 0) { code = 4; break loop; } r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break; // DIVU
          case 0x16: if (b === 0) { code = 4; break loop; } r = (a >>> 0) % (b >>> 0) | 0; break; // MODU
          case 0x18: r = a & b; break; // AND
          case 0x19: r = a | b; break; // OR
          case 0x1a: r = a ^ b; break; // XOR
          case 0x1c: r = a << (b & 31); break; // SHL, only the count's low 5 bits
          case 0x1d: r = a >> (b & 31); break; // SHR, arithmetic
          case 0x1e: r = (a >>> (b & 31)) | 0; break; // SHRU, logical, read back as signed
          case 0x20: r = a === b ? 1 : 0; break; // EQ
          case 0x21: r = a < b ? 1 : 0; break; // LT, signed
          default: r = a >>> 0 < b >>> 0 ? 1 : 0; break; // LTU, unsigned
        }
        sp -= 2;
        D[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: { // JMP, JZ, JNZ: pc = nx + signed 16-bit offset
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) {
          const v = D[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33: if (csp === 64) { code = 7; break loop; } // CALL, unsigned target, checked when it lands
        C[csp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34: if (csp === 0) { code = 8; break loop; } pc = C[--csp]; break; // RET
      case 0x40: { // LOAD: an address outside 0 to 255 traps 6
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) { code = 6; break loop; }
        D[sp - 1] = M[addr];
        break;
      }
      case 0x41: { // STORE
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr >= 256) { code = 6; break loop; }
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 0x50: { // PRINT, decimal ASCII: a leading - when negative and nothing else
        const v = D[sp - 1];
        let u = v < 0 ? -v : v, q = 12;
        do { dec[--q] = 48 + u % 10; u = Math.floor(u / 10); } while (u > 0);
        if (v < 0) dec[--q] = 45;
        const len = 12 - q;
        if (olen + len > 65536) { code = 11; break loop; } // it writes none of its bytes
        sp--;
        out.set(dec.subarray(q), olen);
        olen += len;
        break;
      }
      case 0x51: if (olen + 1 > 65536) { code = 11; break loop; } out[olen++] = D[--sp] & 255; break; // PUTC
      case 0x52: D[sp++] = inPos < input.length ? input[inPos++] : -1; break; // IN, -1 once used up
      default: code = D[--sp] & 255; break loop; // 0x53 EXIT, its low byte
    }
  }
  return { out: out.subarray(0, olen), exit: code };
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const d = join(I, id);
  const r = run(new Uint8Array(readFileSync(join(d, 'program.bin'))), new Uint8Array(readFileSync(join(d, 'input.bin'))));
  const o = join(O, id);
  mkdirSync(o, { recursive: true });
  writeFileSync(join(o, 'stdout.bin'), r.out);
  writeFileSync(join(o, 'exit.txt'), `${r.exit}\n`);
}
