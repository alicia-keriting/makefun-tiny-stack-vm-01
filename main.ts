import{readdirSync as d,readFileSync as r,writeFileSync as w,mkdirSync as m}from'fs';
const S='0Aq46:;?////////999999959995999/999/////////////PTTP0///////////58//////////////4414';
function f(p,q,u){
const n=p.length,D=new Int32Array(576),b=Buffer.alloc(65536);
let sp=0,cp=0,ol=0,ip=0,pc=0,st=1e6,c=0;
L:for(;;){
if(!st--){c=10;break}
if(pc>>>0>=n){c=9;break}
const op=p[pc],v=S.charCodeAt(op)-48;
if(!(v>=0)){c=5;break}
const x=pc+1+(v>>4),z=v>>2&3;
if(x>n){c=9;break}
c=z>sp?2:sp-z+(v&3)>256?3:0;if(c)break
pc=x;
switch(op){
case 0:break L;
case 1:D[sp++]=p.readInt8(x-1);break;
case 2:D[sp++]=p.readInt32LE(x-4);break;
case 3:--sp;break;
case 4:case 6:D[sp]=D[sp-(op>4?2:1)];sp++;break;
case 5:[D[sp-2],D[sp-1]]=[D[sp-1],D[sp-2]];break;
case 7:[D[sp-3],D[sp-2],D[sp-1]]=[D[sp-2],D[sp-1],D[sp-3]];break;
case 23:case 27:D[sp-1]=op>25?~D[sp-1]:-D[sp-1];break;
case 48:case 49:case 50:{const y=op>48?D[--sp]:0;if((op>49)==!!y)pc=x+p.readInt16LE(x-2);break}
case 51:if(cp>63){c=7;break L}D[256+cp++]=x;pc=p[x-2]|p[x-1]<<8;break;
case 52:if(!cp){c=8;break L}pc=D[256+--cp];break;
case 64:case 65:{const a=D[sp-1];if(a>>>0>255){c=6;break L}65>op?D[sp-1]=D[320+a]:(D[320+a]=D[sp-2],sp-=2);break}
case 80:{const s=D[sp-1]+'';if(ol+s.length>65536){c=11;break L}sp--;ol+=b.write(s,ol);break}
case 81:if(ol>65535){c=11;break L}b[ol++]=D[--sp]&255;break;
case 82:D[sp++]=q[ip++]??-1;break;
case 83:c=D[--sp]&255;break L;
default:{const b=D[sp-1],a=D[sp-2],k=b&31,A=a>>>0,B=b>>>0;if(op>18&23>op&!b){c=4;break L}D[sp-2]=18>op?(17>op?a+b:a-b):19>op?Math.imul(a,b):21>op?op&1?a/b:a%b:23>op?op&1?A/B:A%B:27>op?op-24?op-25?a^b:a|b:a&b:31>op?op-28?op-29?a>>>k:a>>k:a<<k:+(op>33?B>A:op>32?b>a:a==b);sp--;break}
}
}
w(u+'/stdout.bin',b.subarray(0,ol));w(u+'/exit.txt',''+c)
}
const P=process.env,I=P.MAKEFUN_INPUT_DIR||'/input',O=P.MAKEFUN_OUTPUT_DIR||'/output';
for(const i of d(I)){process.chdir(I+'/'+i);m(O+'/'+i,{recursive:true});f(r('program.bin'),r('input.bin'),O+'/'+i)}
