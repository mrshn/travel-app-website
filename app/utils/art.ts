// @ts-nocheck
/* Original illustrations (hand-coded SVG), lit by the time of day. Ported from the Rome trip page. */
/* ===== ART: original illustrations, lit by time of day ===== */
const ART=(function(){
"use strict";
var TOD={
 dawn:{name:"dawn",sky:["#56609F","#CF8FA0","#F6CDA3"],sun:"#FFE6BF",sunR:15,sunX:.76,sunY:.72,stone:["#F0D8C9","#DBB7A8","#B38F8A","#6B5462"],lead:"#A8A1BA",brick:"#C8937F",marble:["#F5E5DE","#D9C2BE"],walls:["#DDA189","#BD7A6A","#E6BBA7"],veg:"#4D6558",vegD:"#344A42",grass:"#7E957B",ground:"#A7968F",groundL:"#BCA9A1",water:"#90B9CB",turq:"#86C6C8",win:"#6A5162",haze:"#CFA7B2",layers:["#D5AFBA","#B98590","#8E6571","#34364A"],bronze:"#5E5A55",glow:false},
 day:{name:"day",sky:["#3C8AD0","#84BDE7","#D8EEF9"],sun:"#FFF7DB",sunR:14,sunX:.84,sunY:.17,stone:["#F4E7CC","#DECAA4","#BB9F78","#6B533E"],lead:"#9DB0BA",brick:"#C98F66",marble:["#F7F4EE","#DCD6CB"],walls:["#E7A765","#CF7150","#EDC18F"],veg:"#44744F",vegD:"#2D523B",grass:"#79A05A",ground:"#B0A594",groundL:"#C9BFAE",water:"#58B5C8",turq:"#46C3BF",win:"#5B4838",haze:"#B9D7E7",layers:["#AFC6D6","#D1B489","#C08458","#2F4A3A"],bronze:"#5F6B55",glow:false},
 golden:{name:"golden",sky:["#E38B57","#F3B46E","#FBE2A9"],sun:"#FFF1C4",sunR:18,sunX:.8,sunY:.6,stone:["#F9DBA9","#EAB880","#C78756","#76452C"],lead:"#B7A38F",brick:"#DC8D5B",marble:["#FBEBD6","#E8C8A6"],walls:["#F0A45A","#D46B45","#F6C88F"],veg:"#4E6139",vegD:"#344429",grass:"#8E9A4E",ground:"#B89272",groundL:"#CFAE8A",water:"#63A9B6",turq:"#56B6B0",win:"#6B3F27",haze:"#F2C390",layers:["#F2C893","#D99A66","#A96A45","#3B3826"],bronze:"#5C4B35",glow:false},
 sunset:{name:"sunset",sky:["#3B3676","#C65E6B","#F4A865"],sun:"#FFD28C",sunR:20,sunX:.7,sunY:.84,stone:["#EEB892","#D48F6D","#A0614F","#4E2F45"],lead:"#8F7C97",brick:"#AE6A58",marble:["#F3CDBD","#D6A396"],walls:["#CB7C5F","#A65249","#D99D81"],veg:"#383750",vegD:"#25243A",grass:"#5E5A55",ground:"#7F5F63",groundL:"#96737A",water:"#6E7FA9",turq:"#6F9FB5",win:"#4E2F45",haze:"#C47E7C",layers:["#B97684","#6E4460","#4A2E45","#1E1726"],bronze:"#3B2F3A",glow:false},
 blue:{name:"blue",sky:["#131B44","#2E3E85","#7B69A7"],sun:null,stone:["#F2C582","#D6975C","#94603D","#241F44"],lead:"#B9C3D2",brick:"#C98A56",marble:["#F6E4C4","#D8B98E"],walls:["#7C5C70","#5F4562","#8E6D7A"],veg:"#1B203E",vegD:"#12152D",grass:"#26294A",ground:"#2E2C4B",groundL:"#3C3A5C",water:"#2F5080",turq:"#2FBFC4",win:"#FFD98A",haze:"#4A4E8D",layers:["#4A4F8F","#34376B","#23244A","#111227"],bronze:"#26243C",glow:true},
 night:{name:"night",sky:["#070B25","#121A45","#252A5A"],sun:null,moon:true,stars:true,stone:["#F2C47C","#D2904F","#8B5531","#15142F"],lead:"#C8D1DA",brick:"#C98450",marble:["#F7E6C2","#D6B684"],walls:["#4C3D57","#3B2F49","#5C4A62"],veg:"#10132A",vegD:"#0A0C1E",grass:"#161933",ground:"#201F39",groundL:"#2C2B47",water:"#22466F",turq:"#26C7CB",win:"#FFD27A",haze:"#2F3064",layers:["#262D5E","#1B2048","#121634","#070918"],bronze:"#1A1930",glow:true}
};
var UID=0;
function r1(v){return Math.round(v*10)/10}
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function at(o){return o?" "+o:""}
function RC(x,y,w,h,f,o){return '<rect x="'+r1(x)+'" y="'+r1(y)+'" width="'+r1(w)+'" height="'+r1(h)+'" fill="'+f+'"'+at(o)+'/>'}
function PG(p,f,o){return '<polygon points="'+p.map(function(q){return r1(q[0])+","+r1(q[1])}).join(" ")+'" fill="'+f+'"'+at(o)+'/>'}
function PA(d,f,o){return '<path d="'+d+'" fill="'+f+'"'+at(o)+'/>'}
function CI(x,y,r,f,o){return '<circle cx="'+r1(x)+'" cy="'+r1(y)+'" r="'+r1(r)+'" fill="'+f+'"'+at(o)+'/>'}
function EL(x,y,rx,ry,f,o){return '<ellipse cx="'+r1(x)+'" cy="'+r1(y)+'" rx="'+r1(rx)+'" ry="'+r1(ry)+'" fill="'+f+'"'+at(o)+'/>'}
function LN(x1,y1,x2,y2,c,w,o){return '<line x1="'+r1(x1)+'" y1="'+r1(y1)+'" x2="'+r1(x2)+'" y2="'+r1(y2)+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"'+at(o)+'/>'}
function ARCH(x,y,w,h,f,o){var r=w/2;return PA("M"+r1(x)+" "+r1(y+h)+"V"+r1(y+r)+"A"+r1(r)+" "+r1(r)+" 0 0 1 "+r1(x+w)+" "+r1(y+r)+"V"+r1(y+h)+"Z",f,o)}
function DOME(cx,by,rx,ry,f,o){return PA("M"+r1(cx-rx)+" "+r1(by)+"A"+r1(rx)+" "+r1(ry)+" 0 0 1 "+r1(cx+rx)+" "+r1(by)+"Z",f,o)}
function OP(v){return 'opacity="'+v+'"'}
function pine(x,y,s,c,cd){
  var h=92*s,ty=y-h*.8;
  var o=PA("M"+r1(x-2.4*s)+" "+r1(y)+"C"+r1(x-1.5*s)+" "+r1(y-h*.35)+" "+r1(x+1.5*s)+" "+r1(y-h*.6)+" "+r1(x+3*s)+" "+r1(ty+4*s)+"L"+r1(x+6.5*s)+" "+r1(ty+4*s)+"C"+r1(x+4.5*s)+" "+r1(y-h*.55)+" "+r1(x+2.4*s)+" "+r1(y-h*.3)+" "+r1(x+2.4*s)+" "+r1(y)+"Z",cd);
  o+=LN(x+4.5*s,ty+5*s,x-9*s,ty-1*s,cd,r1(1.8*s));
  o+=EL(x+4*s,ty,44*s,10*s,cd)+EL(x-14*s,ty-4*s,24*s,9*s,c)+EL(x+20*s,ty-5*s,27*s,10*s,c)+EL(x+3*s,ty-10*s,26*s,8*s,c);
  return o;
}
function cypress(x,y,s,c){return PA("M"+x+" "+y+"C"+r1(x-9*s)+" "+r1(y-28*s)+" "+r1(x-5*s)+" "+r1(y-70*s)+" "+x+" "+r1(y-96*s)+"C"+r1(x+5*s)+" "+r1(y-70*s)+" "+r1(x+9*s)+" "+r1(y-28*s)+" "+x+" "+y+"Z",c)}
function wins(x,y,cols,rows,w,h,gx,gy,P,R,shut){
  var o="";for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){var X=x+c*gx,Y=y+r*gy;var f=P.glow?(R()<.72?P.win:"#2F2B47"):P.win;o+=RC(X,Y,w,h,f,P.glow?"":OP(.82));if(shut)o+=RC(X-w*.46,Y,w*.4,h,shut)+RC(X+w*1.06,Y,w*.4,h,shut)}return o;
}
function haze(R,P,W,base,step,min,var_){var o="";for(var x=0;x<W;x+=step){var h=min+R()*var_;o+=RC(x,base-h,step+1,h,P.layers[0])}return o}
function people(R,n,x0,x1,y0,y1,c){var o="";for(var i=0;i<n;i++){var x=x0+R()*(x1-x0),y=y0+R()*(y1-y0);o+=CI(x,y-4.2,1.8,c)+RC(x-1.6,y-2.6,3.2,6,c,'rx="1.2"')}return o}
function cat(x,y,s,c){return EL(x,y,7*s,5.5*s,c)+CI(x+5.5*s,y-6.5*s,3.8*s,c)+PG([[x+2.6*s,y-8.5*s],[x+3.6*s,y-13*s],[x+5.4*s,y-9.6*s]],c)+PG([[x+6*s,y-9.8*s],[x+8.2*s,y-13*s],[x+8.6*s,y-8.2*s]],c)+PA("M"+r1(x-6.5*s)+" "+r1(y+2*s)+"Q"+r1(x-15*s)+" "+r1(y+1*s)+" "+r1(x-12*s)+" "+r1(y-8*s),"none",'stroke="'+c+'" stroke-width="'+r1(2.2*s)+'" stroke-linecap="round"')}
function catenary(x1,y1,x2,y2,sag){var cx=(x1+x2)/2,cy=Math.max(y1,y2)+sag;return{d:"M"+r1(x1)+" "+r1(y1)+"Q"+r1(cx)+" "+r1(cy)+" "+r1(x2)+" "+r1(y2),pt:function(t){var a=(1-t)*(1-t),b=2*(1-t)*t,c=t*t;return[a*x1+b*cx+c*x2,a*y1+b*cy+c*y2]}}}
function bulbs(cat,n,P,col){var o=PA(cat.d,"none",'stroke="'+(P.glow?"#2A2640":"#4A4038")+'" stroke-width="1"');for(var i=1;i<n;i++){var p=cat.pt(i/n);if(P.glow)o+=CI(p[0],p[1],4.5,col||"#FFE7A0",OP(.25));o+=CI(p[0],p[1],1.8,P.glow?(col||"#FFE9A8"):"#F6F1E2")}return o}

function skyDefs(P,id){return '<linearGradient id="'+id+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+P.sky[0]+'"/><stop offset=".55" stop-color="'+P.sky[1]+'"/><stop offset="1" stop-color="'+P.sky[2]+'"/></linearGradient>'}
function skyBody(P,id,W,H,R,sun){
  var b=RC(0,0,W,H,"url(#"+id+"s)");
  if(P.stars){for(var i=0;i<Math.round(W/8);i++)b+=CI(R()*W,R()*H*.55,.5+R()*.9,"#FFFFFF",OP((.35+R()*.55).toFixed(2)))}
  if(P.moon){var x=W*.82,y=H*.17,r=H*.05;b+=CI(x,y,r*2.8,"#FFFFFF",OP(.06))+PA("M"+r1(x)+" "+r1(y-r)+"A"+r1(r)+" "+r1(r)+" 0 1 0 "+r1(x)+" "+r1(y+r)+"A"+r1(r*.7)+" "+r1(r)+" 0 1 1 "+r1(x)+" "+r1(y-r)+"Z","#F6F0D6")}
  if(P.sun){var sx=W*(sun?sun[0]:P.sunX),sy=H*(sun?sun[1]:P.sunY),sr=P.sunR*H/240;b+=CI(sx,sy,sr*3.2,P.sun,OP(.14))+CI(sx,sy,sr*1.8,P.sun,OP(.28))+CI(sx,sy,sr,P.sun)}
  return b;
}

var S={};
/* ---------- landmarks ---------- */
S.colosseum=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  var d='<linearGradient id="'+id+'w" x1="0" x2="1"><stop offset="0" stop-color="'+lo+'"/><stop offset=".32" stop-color="'+hi+'"/><stop offset=".72" stop-color="'+mid+'"/><stop offset="1" stop-color="'+lo+'"/></linearGradient>';
  b+=haze(R,P,400,202,18,16,26);
  b+=pine(26,204,1.05,P.veg,P.vegD)+pine(378,206,.78,P.veg,P.vegD);
  var af=P.glow?"#FFD27A":dk,ao=P.glow?"":OP(.8);
  b+=PG([[246,110],[364,122],[364,200],[246,200]],lo);
  for(var row=0;row<2;row++){var yy=row?164:128,hh=row?32:26;for(var x=254;x<360;x+=15)b+=ARCH(x,yy,8.5,hh,P.glow?"#FFC870":dk,ao)}
  var top=function(x){return 74+15*Math.pow((x-200)/166,2)};
  var pts=[];for(var X=36;X<=266;X+=6)pts.push([X,top(X)]);
  pts.push([268,90],[276,90],[279,101],[287,105],[291,118],[300,122],[304,140],[315,146],[319,168],[334,172],[338,200],[36,200]);
  d+='<clipPath id="'+id+'c"><polygon points="'+pts.map(function(p){return r1(p[0])+","+r1(p[1])}).join(" ")+'"/></clipPath>';
  b+=PG(pts,"url(#"+id+"w)");
  var g="";[110,140,170].forEach(function(y){g+=RC(30,y,340,3.2,lo)});
  var N=21;
  for(var i=0;i<N;i++){var t=-1.25+2.5*i/(N-1),cx=200+168*Math.sin(t),bw=17.5*Math.cos(t)+1.2,aw=bw*.6;
    g+=RC(cx-bw/2-.5,112,1.1,88,hi,OP(.55));
    [[176,22],[146,22],[116,22]].forEach(function(l){g+=ARCH(cx-aw/2,l[0],aw,l[1],af,ao)});
    if(i%2===0)g+=RC(cx-aw*.28,88,aw*.56,9,af,OP(.72));}
  b+='<g clip-path="url(#'+id+'c)">'+g+'</g>';
  b+=RC(0,200,400,40,P.ground)+RC(0,200,400,3,P.groundL);
  b+=people(R,8,60,340,208,226,dk);
  return {d:d,b:b};
};
S.stpeters=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=haze(R,P,400,198,16,10,18);
  [118,282].forEach(function(x){b+=RC(x-13,116,26,12,mid)+DOME(x,117,14,14,P.lead)+RC(x-2,98,4,7,hi)+CI(x,97,2,hi)});
  b+=RC(146,99,108,24,mid);for(var k=0;k<10;k++)b+=RC(150+k*10.6,102,3.4,18,hi);
  b+=DOME(200,100,53,57,P.lead);
  for(k=-3;k<=3;k++){var bx=200+k*15;b+=PA("M"+bx+" 100Q"+(200+k*16.5)+" 56 200 44","none",'stroke="'+hi+'" stroke-width="1.3" '+OP(.75))}
  b+=RC(193,30,14,15,mid)+DOME(200,31,8,7,P.lead)+LN(200,24,200,14,dk,1.4)+LN(196,18,204,18,dk,1.4);
  b+=RC(84,124,232,74,mid)+RC(80,118,240,8,lo);
  for(k=0;k<14;k++)b+=RC(86+k*17.3,110,4,8,hi)+CI(88+k*17.3,109,2.3,hi);
  for(k=0;k<8;k++){var x=95+k*29.5;b+=RC(x,132,8.5,64,hi)+RC(x+6,132,2.5,64,lo,OP(.5))+RC(x-1.5,130,11.5,3,lo)}
  for(k=0;k<7;k++){x=106+k*29.5;b+=RC(x,142,8,9,wf,OP(.8))+ARCH(x-1,170,10,26,wf,OP(.85))}
  b+=PG([[178,133],[222,133],[200,123]],hi)+RC(193,150,14,13,wf);
  b+=PA("M0 172Q50 176 88 190V200H0Z",hi)+PA("M400 172Q350 176 312 190V200H400Z",hi);
  for(x=4;x<88;x+=6)b+=LN(x,175+(x/88)*14,x,200,lo,1.6);
  for(x=396;x>312;x-=6)b+=LN(x,175+((400-x)/88)*14,x,200,lo,1.6);
  b+=RC(0,198,400,42,P.ground)+EL(200,216,150,14,P.groundL);
  var ob=P.glow?"#E0B27A":"#9C8B78";
  b+=PG([[196.5,208],[203.5,208],[202.2,150],[197.8,150]],ob)+PG([[197.8,150],[202.2,150],[200,143]],ob)+RC(193.5,206,13,5,lo);
  b+=people(R,10,40,360,214,232,dk);
  return {d:"",b:b};
};
S.pantheon=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  for(var x=0;x<400;x+=20){var h=24+R()*36;b+=RC(x,200-h,21,h,P.walls[(R()*3)|0],OP(.6))}
  b+=DOME(200,104,124,44,P.lead)+DOME(200,104,124,15,mid,OP(.55));
  b+=RC(70,104,260,94,P.brick);for(var y=112;y<196;y+=10)b+=RC(70,y,260,1,dk,OP(.14));
  b+=RC(112,94,176,30,mid)+PG([[112,94],[288,94],[200,72]],mid);
  b+=RC(100,132,200,66,dk,OP(.62));
  b+=PG([[96,122],[304,122],[200,86]],hi)+PG([[110,119],[290,119],[200,92]],mid);
  b+=RC(96,122,208,12,hi)+RC(132,126,136,3.2,lo,OP(.8));
  var gr=P.glow?"#E3B47A":"#B8AC9E";
  for(var k=0;k<8;k++){x=104+k*26;b+=RC(x,134,12,62,gr)+RC(x+2.5,138,3,54,"#FFFFFF",OP(.25))+RC(x-2,132,16,4,hi)+RC(x-2,193,16,3,hi)}
  b+=RC(92,196,216,4,lo)+RC(0,200,400,40,P.ground)+RC(0,200,400,3,P.groundL);
  b+=people(R,7,20,380,210,230,dk);
  return {d:"",b:b};
};
S.trevi=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=RC(18,58,364,144,mid)+RC(14,54,372,6,lo)+RC(18,48,364,6,hi);
  for(var k=0;k<18;k++)b+=RC(22+k*20.3,42,3,6,hi);
  for(var r=0;r<3;r++)for(var c=0;c<4;c++){var y=74+r*34;[30+c*26,286+c*26].forEach(function(x){b+=RC(x,y,12,19,wf,P.glow?"":OP(.78))+PG([[x-2,y],[x+14,y],[x+6,y-5]],lo)})}
  b+=RC(136,50,128,152,hi)+RC(130,40,140,14,hi)+RC(130,52,140,4,lo)+EL(200,34,15,9,hi)+RC(186,26,28,4,mid);
  [146,168,232,254].forEach(function(x){b+=RC(x-3,24,6,16,hi)+CI(x,22,3,hi)});
  [142,160,232,250].forEach(function(x){b+=RC(x,62,9,100,mid)+RC(x-1.5,58,12,5,lo)});
  b+=ARCH(174,70,52,90,dk,OP(.85));
  var wh=P.glow?"#FFF3D6":"#FAF6EE";
  b+=CI(200,96,5.5,wh)+PG([[192,103],[208,103],[213,142],[187,142]],wh)+LN(207,105,216,88,wh,3)+EL(200,147,20,6,wh);
  [150,238].forEach(function(x){b+=ARCH(x-1,98,16,34,dk,OP(.7))+RC(x+4,106,6,22,wh)});
  for(var i=0;i<70;i++){b+=EL(40+R()*320,150+R()*44,6+R()*14,4+R()*7,[hi,mid,lo][(R()*3)|0])}
  for(i=0;i<10;i++)b+=EL(40+R()*320,160+R()*30,4,2.5,P.veg);
  [178,188,200,212,222].forEach(function(x,j){b+=RC(x,148+(j%2)*6,j==2?7:4,46,"#E9FBFF",OP(.85))});
  b+=RC(0,194,400,4,hi)+RC(6,198,388,20,P.turq)+RC(6,200,388,4,"#FFFFFF",OP(.28))+RC(0,218,400,22,P.ground);
  if(P.glow)b+=RC(6,198,388,20,"#7FF6F2",OP(.18));
  return {d:"",b:b};
};
S.steps=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=RC(0,58,104,146,P.walls[2])+RC(0,96,44,108,P.walls[0])+RC(296,66,104,138,P.walls[0])+RC(350,40,50,164,P.walls[1]);
  b+=wins(10,70,4,4,9,14,22,30,P,R)+wins(304,80,4,4,9,14,22,28,P,R);
  b+=RC(152,54,96,58,hi)+RC(146,24,24,88,hi)+RC(230,24,24,88,hi);
  [158,242].forEach(function(x){b+=DOME(x,24,12,10,mid)+RC(x-1,10,2,6,mid)+ARCH(x-5,32,10,16,wf,P.glow?"":OP(.8))+CI(x,62,5,lo)+CI(x,62,3.6,hi)});
  b+=PG([[172,66],[228,66],[200,52]],mid)+ARCH(192,82,16,30,wf,P.glow?"":OP(.85));
  var ob=P.glow?"#E0B27A":"#A48F7A";
  b+=PG([[197.2,114],[202.8,114],[201.6,66],[198.4,66]],ob)+PG([[198.4,66],[201.6,66],[200,60]],ob)+RC(193,110,14,5,lo);
  b+=RC(104,110,192,6,mid);for(var x=108;x<292;x+=5)b+=RC(x,104,2,6,mid);
  for(var i=0;i<22;i++){var y=116+i*3.8,hw=44+i*6.8,land=(i==7||i==15);b+=RC(200-hw,y,hw*2,land?5:3.9,i%2?hi:mid)}
  b+=PG([[156,116],[152,116],[50,200],[62,200]],lo)+PG([[244,116],[248,116],[350,200],[338,200]],lo);
  b+=RC(0,200,400,40,P.ground);
  b+=PA("M156 206Q200 224 244 206L236 198Q200 208 164 198Z",hi)+EL(200,202,28,3.6,P.water);
  b+=people(R,12,70,330,150,196,dk);
  return {d:"",b:b};
};
S.castel=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  b+=pine(22,168,1.0,P.veg,P.vegD)+pine(92,164,.7,P.veg,P.vegD);
  b+='<g transform="translate(-30 0)">'+RC(214,118,176,58,P.brick)+RC(214,114,176,6,mid);for(var x=216;x<388;x+=10)b+=RC(x,108,6,7,P.brick);
  b+=RC(244,70,124,50,mid)+RC(244,70,124,8,lo);for(x=246;x<366;x+=9)b+=RC(x,64,5,7,mid);
  b+=wins(256,88,6,1,5,8,18,0,P,R);
  b+=RC(282,48,48,24,hi)+RC(278,46,56,4,lo);
  var br=P.glow?"#3E4A44":"#566A5A";
  b+=RC(302,32,8,16,br)+CI(306,29,3,br)+PG([[304,34],[288,24],[298,40]],br)+PG([[308,34],[324,24],[314,40]],br)+LN(310,36,318,44,br,1.4)+'</g>';
  b+=RC(0,176,400,64,P.water);
  b+=RC(214,178,124,34,mid,OP(.16))+RC(184,176,176,14,P.brick,OP(.2));
  for(var i=0;i<16;i++){b+=RC(R()*380,184+R()*52,20+R()*50,1.4,"#FFFFFF",OP(.25))}
  b+=RC(0,158,196,30,hi)+RC(0,156,196,4,mid);
  for(var k=0;k<3;k++)b+=PA("M"+(10+k*62)+" 189A26 22 0 0 1 "+(62+k*62)+" 189Z",P.water);
  var wh=P.glow?"#FFF1D2":"#F6F2EA";
  for(k=0;k<9;k++){x=8+k*21;b+=RC(x,144,3.6,12,wh)+CI(x+1.8,142,2.3,wh)}
  return {d:"",b:b};
};
S.vittoriano=function(P,id,R){
  var m1=P.marble[0],m2=P.marble[1],b="",br=P.glow?"#2B2A28":P.bronze;
  b+=haze(R,P,400,202,18,16,26);
  b+=RC(36,172,328,28,m1);for(var y=174;y<200;y+=3.4)b+=RC(36,y,328,.9,m2);
  b+=RC(58,118,284,56,m1)+RC(58,118,284,5,m2);
  b+=RC(80,76,240,42,m2)+RC(78,68,244,8,m1)+RC(80,62,240,6,m2);
  for(var k=0;k<17;k++)b+=RC(84+k*14.2,76,5,42,m1);
  [56,300].forEach(function(x){b+=RC(x,54,44,66,m1)+RC(x-2,50,48,6,m2);for(var j=0;j<4;j++)b+=RC(x+5+j*10,62,4,52,m2);
    var cx=x+22;b+=RC(cx-16,44,32,6,m2);for(var h=0;h<4;h++){b+=EL(cx-12+h*8,36,6,3.2,br)+LN(cx-15+h*8,38,cx-16+h*8,44,br,1.2)+LN(cx-9+h*8,38,cx-8+h*8,44,br,1.2)}
    b+=RC(cx-3,28,8,8,br)+PG([[cx,20],[cx-9,14],[cx-2,26]],br)+PG([[cx+2,20],[cx+11,14],[cx+4,26]],br)+CI(cx+1,18,2.2,br)});
  b+=RC(186,130,28,24,m1);b+=EL(200,120,12,6,br)+LN(191,124,190,131,br,1.6)+LN(209,124,210,131,br,1.6)+CI(210,114,3,br)+CI(198,110,3,br)+RC(195,112,6,8,br);
  b+=RC(176,152,48,20,m2)+PA("M178 150q2 -7 4 0z","#FF9E3D")+PA("M218 150q2 -7 4 0z","#FF9E3D");
  b+=RC(0,200,400,40,P.ground);
  b+=people(R,9,40,360,208,230,P.stone[3]);
  return {d:"",b:b};
};
S.forum=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  b+=PA("M0 150Q90 118 190 132T400 126V240H0Z",P.grass);
  b+=pine(330,138,.9,P.veg,P.vegD)+pine(372,134,.7,P.veg,P.vegD)+pine(96,142,.75,P.veg,P.vegD);
  b+=RC(236,112,62,30,P.brick);for(var k=0;k<4;k++)b+=ARCH(240+k*14,120,9,22,dk,OP(.7));
  b+=RC(0,186,400,54,P.groundL);
  b+=RC(152,116,76,72,mid)+RC(148,104,84,14,hi)+ARCH(180,138,20,50,dk,OP(.85))+ARCH(160,154,11,34,dk,OP(.85))+ARCH(209,154,11,34,dk,OP(.85));
  [156,176,202,222].forEach(function(x){b+=RC(x,120,3,66,hi,OP(.6))});
  b+=RC(30,164,124,26,lo);
  for(k=0;k<6;k++){var x=36+k*21;b+=RC(x,96,10,68,hi)+RC(x-2,93,14,4,mid)+CI(x-1,95,2,mid)+CI(x+11,95,2,mid)+RC(x+7,98,2.5,64,lo,OP(.5))}
  b+=RC(30,78,130,16,mid)+RC(38,82,114,4,lo);
  b+=RC(256,150,72,40,lo);
  for(k=0;k<3;k++){x=262+k*22;b+=RC(x,64,11,86,hi)+RC(x-3,58,17,7,mid)+RC(x+8,66,2.5,82,lo,OP(.5))}
  b+=RC(258,44,66,14,mid);
  for(var i=0;i<9;i++){b+=EL(10+R()*380,200+R()*28,6+R()*10,3+R()*3,[hi,mid][(R()*2)|0])}
  b+=cypress(368,192,1.05,P.vegD)+cypress(12,190,.8,P.vegD);
  b+=people(R,6,120,380,200,230,dk);
  return {d:"",b:b};
};
S.navona=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=RC(0,86,118,114,P.walls[0])+RC(282,80,118,120,P.walls[1]);
  b+=wins(10,98,4,3,10,15,26,30,P,R)+wins(292,94,4,3,10,15,26,30,P,R);
  b+=RC(124,100,152,100,hi)+RC(120,94,160,8,mid);
  b+=RC(166,66,68,30,mid)+DOME(200,68,36,38,P.lead)+RC(195,22,10,10,hi)+DOME(200,23,6,5,P.lead)+LN(200,18,200,11,dk,1.2);
  [132,268].forEach(function(x){b+=RC(x-14,54,28,48,hi)+ARCH(x-5,62,10,18,wf,OP(.8))+DOME(x,54,10,9,mid)+RC(x-1,40,2,6,mid)});
  for(var k=0;k<6;k++)b+=RC(146+k*22,108,7,88,mid,OP(.85));
  b+=ARCH(191,158,18,38,wf,OP(.85));
  b+=RC(0,196,400,44,P.ground);
  b+=EL(200,212,122,12,P.turq)+EL(200,208,122,12,"none",'stroke="'+hi+'" stroke-width="3"');
  for(var i=0;i<28;i++){b+=EL(158+R()*84,164+R()*40,5+R()*9,4+R()*6,[hi,mid,lo][(R()*3)|0])}
  var ob=P.glow?"#E4B98A":"#B39F8B";
  b+=PG([[195,166],[205,166],[203,86],[197,86]],ob)+PG([[197,86],[203,86],[200,78]],ob)+CI(200,75,2.2,"#FFFFFF");
  [[164,184],[236,184]].forEach(function(p){b+=CI(p[0],p[1]-9,3,"#F8F4EC")+EL(p[0],p[1],7,6,"#F8F4EC")});
  b+=people(R,8,10,390,220,236,dk);
  return {d:"",b:b};
};
S.alley=function(P,id,R){
  var w=P.walls,b="",d="";
  var LP=function(u,v){var x=150*u,yt=44*u,yb=240-46*u;return[x,yt+v*(yb-yt)]};
  var RP=function(u,v){var x=400-150*u,yt=34*u,yb=240-46*u;return[x,yt+v*(yb-yt)]};
  var Q=function(F,u1,u2,v1,v2){return[F(u1,v1),F(u2,v1),F(u2,v2),F(u1,v2)]};
  b+=RC(150,50,100,146,w[2]);
  b+=wins(166,64,3,4,10,14,28,30,P,R,"#3F6B50");
  b+=PG([[0,0],[150,44],[150,196],[0,240]],w[0])+PG([[400,0],[250,34],[250,196],[400,240]],w[1]);
  var sh=P.glow?"#26452F":"#3F6B50";
  [[.06,.18],[.34,.44],[.58,.66],[.8,.86]].forEach(function(u){[[.12,.26],[.36,.5],[.6,.72]].forEach(function(v){
    var f=P.glow?(R()<.7?P.win:"#2E2A44"):P.win;b+=PG(Q(LP,u[0],u[1],v[0],v[1]),f)+PG(Q(LP,u[0]-.05,u[0]-.01,v[0],v[1]),sh);
    f=P.glow?(R()<.7?P.win:"#2E2A44"):P.win;b+=PG(Q(RP,u[0],u[1],v[0],v[1]),f)+PG(Q(RP,u[1]+.01,u[1]+.05,v[0],v[1]),sh)})});
  var ivy=P.glow?["#1F3B2A","#18301F","#2A4A32"]:["#3E7A45","#2F6238","#5A9450"];
  for(var i=0;i<230;i++){var u=R()*.64,v=R()*R()*.78,p=LP(u,v);b+=CI(p[0],p[1],(2+R()*4)*(1-u*.5),ivy[(R()*3)|0])}
  for(i=0;i<120;i++){u=R()*.5;v=R()*R()*.5;p=RP(u,v);b+=CI(p[0],p[1],(2+R()*3.6)*(1-u*.5),ivy[(R()*3)|0])}
  b+=PG([[0,240],[150,196],[250,196],[400,240]],P.ground);
  for(i=1;i<9;i++){var t=i/9,y=196+44*t*t;b+=LN(150-150*t*t,y,250+150*t*t,y,P.groundL,1,OP(.6))}
  [[.18,.2],[.46,.3],[.74,.4]].forEach(function(q){var a=LP(q[0],q[1]),c=RP(q[0],q[1]);b+=bulbs(catenary(a[0],a[1],c[0],c[1],22*(1-q[0])),12,P)});
  var lp=LP(.28,.44);b+=RC(lp[0],lp[1],7,11,"#2A2A30")+RC(lp[0]+1.5,lp[1]+2,4,7,P.glow?"#FFE39A":"#E8E2D0");
  return {d:d,b:b};
};
S.skyline=function(P,id,R){
  var L=P.layers,b="",lit=(P.name==="day"||P.name==="dawn"||P.name==="golden");
  b+=PA("M0 176Q120 150 260 166T520 158T800 170V260H0Z",L[0],OP(.75));
  for(var x=0;x<800;x+=14){var h=10+R()*22;b+=RC(x,206-h,15,h+60,L[0])}
  var m=L[1],dm=lit?P.lead:L[1];b+='<g transform="translate(-64 0)">';
  b+=RC(170,122,14,92,m)+PG([[168,122],[186,122],[177,100]],m);
  b+=RC(214,150,8,60,m)+RC(234,150,8,60,m)+RC(214,162,28,50,m)+DOME(218,150,5,6,m)+DOME(238,150,5,6,m);
  b+=RC(262,166,128,46,m)+RC(272,146,108,22,m)+RC(270,134,11,14,m)+RC(371,134,11,14,m)+EL(275.5,130,9,4,m)+EL(376.5,130,9,4,m);
  if(lit)for(var k=0;k<14;k++)b+=RC(276+k*7.4,150,2.4,15,L[0],OP(.55));
  b+=RC(398,188,58,22,m)+DOME(427,189,28,14,dm);
  b+=RC(470,160,38,50,m)+DOME(489,161,19,24,dm)+RC(486,129,6,8,m);
  b+=RC(522,172,30,40,m)+DOME(537,173,14,17,dm)+RC(516,156,7,54,m)+RC(551,156,7,54,m);
  b+=RC(580,168,112,44,m)+RC(600,144,72,26,m)+DOME(636,145,46,50,dm)+RC(631,86,10,12,m)+DOME(636,87,6,5,dm)+LN(636,82,636,73,m,1.6);
  if(lit)for(k=-2;k<=2;k++)b+=PA("M"+(636+k*16)+" 145Q"+(636+k*17)+" 104 636 95","none",'stroke="#FFFFFF" stroke-width="1.2" '+OP(.45));
  b+=RC(716,176,40,36,m)+DOME(736,177,16,14,dm)+'</g>';
  var n=L[2];for(x=0;x<800;x+=22){h=6+R()*16;b+=RC(x,222-h,23,h+40,n);if(P.glow){for(var j=0;j<3;j++)if(R()<.6)b+=RC(x+3+R()*15,226-h+R()*10,2.4,3,P.win)}}
  var f=L[3];
  b+=pine(56,246,1.55,f,f)+pine(150,254,1.05,f,f)+pine(702,248,1.6,f,f)+pine(770,256,1.0,f,f);
  b+=RC(0,234,800,6,f)+RC(0,252,800,8,f);for(x=3;x<800;x+=11)b+=PA("M"+x+" 240h5l-1 3 1.5 3-1.5 3 1 3h-5l1-3-1.5-3 1.5-3z",f);
  b+=RC(518,198,4,40,f)+CI(520,196,5,P.glow?"#FFE7A8":f)+(P.glow?CI(520,196,12,"#FFE7A8",OP(.25)):"");
  return {d:"",b:b};
};
S.skyline.sun=[.78,.5];S.skyline.align="xMaxYMid";
S.skyline.W=800;S.skyline.H=260;
S.borghese=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=pine(40,190,1.25,P.veg,P.vegD)+pine(364,188,1.15,P.veg,P.vegD);
  b+=RC(0,186,400,54,P.grass);
  b+=RC(92,68,56,122,hi)+RC(252,68,56,122,hi)+RC(118,86,164,104,hi);
  b+=RC(88,62,64,8,mid)+RC(248,62,64,8,mid)+RC(114,80,172,8,mid);
  for(var k=0;k<9;k++)b+=RC(120+k*19,72,5,8,mid)+CI(122.5+k*19,71,2.4,mid);
  [[100,94],[128,98],[260,94],[284,98],[100,130],[284,130]].forEach(function(p){b+=ARCH(p[0],p[1],12,22,lo)+RC(p[0]+4,p[1]+6,4,14,"#FAF6EE")});
  b+=wins(152,100,5,1,12,18,22,0,P,R);
  for(k=0;k<5;k++)b+=ARCH(151+k*22,144,14,42,wf,OP(.82));
  b+=PG([[118,196],[168,170],[232,170],[282,196]],mid)+PG([[168,170],[232,170],[232,176],[168,176]],lo);
  b+=EL(200,222,96,10,P.groundL);
  for(k=0;k<8;k++)b+=RC(8+k*50,196,40,10,P.vegD,'rx="5"');
  return {d:"",b:b};
};
S.lake=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],b="";
  b+=RC(0,140,400,100,P.grass);
  for(var i=0;i<16;i++){var x=R()*400;b+=EL(x,140-R()*10,18+R()*20,16+R()*10,[P.veg,P.vegD][(R()*2)|0])}
  b+=pine(40,150,1.1,P.veg,P.vegD)+pine(350,146,1.0,P.veg,P.vegD);
  b+=EL(200,196,214,46,P.water);
  for(i=0;i<12;i++)b+=RC(R()*360,176+R()*56,20+R()*40,1.3,"#FFFFFF",OP(.28));
  b+=EL(200,168,72,9,P.grass)+RC(168,150,64,12,hi);
  for(var k=0;k<4;k++)b+=RC(176+k*14,112,6,38,hi)+RC(178+k*14,112,2,38,lo,OP(.35));
  b+=RC(166,106,68,7,mid)+PG([[166,106],[234,106],[200,92]],hi);
  b+=RC(170,176,60,16,hi,OP(.2));for(k=0;k<4;k++)b+=RC(176+k*14,176,6,26,hi,OP(.18));
  b+=PA("M86 214Q108 224 140 214L136 207H92Z","#7A4B2E")+CI(112,202,3,P.stone[3])+RC(109,204,6,6,P.stone[3])+LN(100,210,84,222,"#5A3A22",1.4)+LN(124,210,142,222,"#5A3A22",1.4);
  return {d:"",b:b};
};
S.tempietto=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  b+=RC(0,96,84,104,mid)+RC(316,96,84,104,mid);
  for(var k=0;k<3;k++)b+=ARCH(8+k*26,130,16,70,dk,OP(.6))+ARCH(324+k*26,130,16,70,dk,OP(.6));
  b+=RC(0,188,400,52,P.ground);
  b+=RC(112,180,176,8,lo)+RC(122,172,156,8,mid);
  b+=RC(140,112,120,60,lo);
  var gc=P.glow?"#D9B889":"#9A968F";
  for(k=0;k<7;k++){var x=128+k*23;b+=RC(x,114,9,58,gc)+RC(x-1.5,110,12,4,hi)}
  b+=RC(122,102,156,9,hi)+RC(122,94,156,8,hi);for(x=126;x<276;x+=5)b+=RC(x,95,2.4,7,lo,OP(.6));
  b+=RC(152,66,96,28,hi);for(k=0;k<4;k++)b+=ARCH(160+k*22,72,9,16,dk,OP(.7));
  b+=DOME(200,67,50,36,P.lead)+RC(195,26,10,8,hi)+CI(200,24,3,hi);
  return {d:"",b:b};
};
S.argentina=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  b+=RC(0,50,400,96,P.walls[0])+RC(130,40,120,106,P.walls[2])+RC(290,56,110,90,P.walls[1]);
  b+=wins(12,62,4,2,10,15,26,34,P,R)+wins(146,54,4,2,10,15,26,34,P,R)+wins(302,70,4,2,10,15,24,30,P,R);
  b+=RC(0,140,400,8,lo)+RC(0,148,400,92,P.groundL);
  for(var i=0;i<14;i++)b+=EL(R()*400,160+R()*70,14+R()*20,4+R()*4,P.grass,OP(.7));
  b+=EL(214,198,80,12,lo);
  [[152,40],[174,52],[196,58],[218,56],[240,46],[262,32]].forEach(function(c){b+=RC(c[0],196-c[1],11,c[1],hi)+RC(c[0]+8,198-c[1],2.4,c[1]-2,lo,OP(.45))});
  [58,78,98].forEach(function(x,j){var h=[74,64,46][j];b+=RC(x,190-h,10,h,hi)});b+=RC(52,188,62,8,lo);
  b+=pine(356,200,1.0,P.veg,P.vegD);
  for(var x=4;x<400;x+=16)b+=RC(x,128,2,12,dk);b+=RC(0,128,400,2.4,dk);
  b+=cat(118,216,1.35,"#2E2622")+cat(268,206,1.1,"#D98A4A")+cat(306,226,1.2,"#F3EEE4");
  return {d:"",b:b};
};
S.capitoline=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk,br=P.glow?"#2A2A26":P.bronze;
  b+=RC(0,96,92,104,mid)+RC(308,96,92,104,mid);
  for(var k=0;k<3;k++)b+=ARCH(8+k*28,160,18,40,dk,OP(.7))+ARCH(318+k*28,160,18,40,dk,OP(.7));
  b+=wins(10,110,3,1,10,16,28,0,P,R)+wins(320,110,3,1,10,16,28,0,P,R);
  b+=RC(96,82,208,100,hi)+RC(92,76,216,8,mid);for(k=0;k<12;k++)b+=RC(98+k*18,68,4,8,mid)+CI(100+k*18,67,2.3,mid);
  b+=RC(186,28,28,56,hi)+RC(182,24,36,6,mid)+RC(194,12,12,12,hi)+DOME(200,12,6,5,mid)+CI(200,50,6,mid)+CI(200,50,4.5,hi);
  b+=wins(106,98,8,2,10,16,24,28,P,R);
  b+=PG([[110,182],[182,142],[200,142],[200,150],[132,182]],mid)+PG([[290,182],[218,142],[200,142],[200,150],[268,182]],mid)+ARCH(193,120,14,22,wf);
  b+=RC(0,182,400,58,P.ground)+EL(200,214,172,24,P.groundL);
  for(k=0;k<12;k++){var a=k/12*Math.PI*2;b+=PA("M200 214Q"+r1(200+60*Math.cos(a+.6))+" "+r1(214+9*Math.sin(a+.6))+" "+r1(200+168*Math.cos(a))+" "+r1(214+23*Math.sin(a)),"none",'stroke="'+lo+'" stroke-width="1" '+OP(.6))}
  b+=RC(192,190,16,22,hi)+EL(200,183,11,5.5,br)+LN(192,186,191,191,br,1.6)+LN(208,186,209,191,br,1.6)+CI(210,178,3,br)+CI(198,174,3,br)+RC(195,176,6,8,br);
  return {d:"",b:b};
};
S.market=function(P,id,R){
  var st=P.stone,mid=st[1],dk=st[3],b="",d="";
  b+=pine(40,150,1.0,P.veg,P.vegD);
  b+=RC(236,62,158,10,mid)+RC(240,70,150,120,P.brick)+ARCH(270,110,40,80,dk,OP(.75))+ARCH(330,110,40,80,dk,OP(.75));
  b+=RC(0,196,400,44,P.ground);
  var cols=[["#C8423A","#F4EEE6"],["#2F7A55","#F4EEE6"],["#2F5FA3","#F4EEE6"],["#E0A12E","#F4EEE6"]];
  [6,104,202,300].forEach(function(x,i){var c=cols[i],cid=id+"a"+i;
    d+='<clipPath id="'+cid+'"><polygon points="'+(x+6)+',120 '+(x+86)+',120 '+(x+94)+',146 '+(x-2)+',146"/></clipPath>';
    var s=RC(x-4,118,100,30,c[1]);for(var k=0;k<11;k++)s+=RC(x-4+k*9.4,118,4.7,30,c[0]);
    b+='<g clip-path="url(#'+cid+')">'+s+'</g>'+RC(x-2,146,96,3,c[0]);
    b+=RC(x+1,148,2,40,dk)+RC(x+89,148,2,40,dk)+RC(x+4,176,84,20,"#8A6A4A");
    for(k=0;k<7;k++){var ix=x+8+R()*72,col=["#D9C9A3","#4C6E8F","#A8433A","#E7B94E","#6C8F5A","#EFE9DD"][(R()*6)|0];b+=R()<.5?RC(ix,164+R()*8,8+R()*6,12-R()*6,col):CI(ix+4,170+R()*4,4+R()*2,col)}});
  b+=people(R,6,20,380,212,234,dk);
  return {d:d,b:b};
};
S.monti=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],b="",w=P.walls;
  b+=RC(0,40,130,160,w[0])+RC(130,70,140,130,w[2])+RC(270,30,130,170,w[1]);
  b+=wins(14,56,4,4,10,15,28,34,P,R,"#3F6B50")+wins(146,86,4,3,10,15,30,32,P,R,"#3F6B50")+wins(286,48,4,4,10,15,28,34,P,R,"#3F6B50");
  var ivy=P.glow?["#1F3B2A","#2A4A32"]:["#3E7A45","#5A9450"];for(var i=0;i<90;i++)b+=CI(270+R()*60,40+R()*R()*120,2+R()*3.5,ivy[(R()*2)|0]);
  b+=RC(0,196,400,44,P.ground);
  b+=EL(200,214,78,12,lo)+EL(200,206,64,10,mid)+EL(200,199,50,8,hi)+EL(200,192,38,6,P.water)+RC(196,160,8,32,hi)+EL(200,160,13,4,hi);
  b+=PA("M200 156q-8 -10 -14 4M200 156q8 -10 14 4","none",'stroke="#E8FBFF" stroke-width="1.6" '+OP(.8));
  var pc=["#2F3D57","#8C3B3B","#3E6B52","#6B4F8C","#C27A2C"];
  [[146,208],[166,212],[236,210],[256,206],[214,216]].forEach(function(p,j){var c=pc[j];b+=CI(p[0],p[1]-11,3.4,c)+PA("M"+(p[0]-5)+" "+p[1]+"q5 -12 10 0z",c)});
  b+=bulbs(catenary(0,70,400,58,54),16,P);
  var bc=catenary(0,96,400,90,40),cc=["#C8423A","#E0A12E","#2F7A55","#2F5FA3","#F4EEE6"];
  b+=PA(bc.d,"none",'stroke="#4A4038" stroke-width=".8"');
  for(i=1;i<20;i++){var p=bc.pt(i/20);b+=PG([[p[0]-4,p[1]],[p[0]+4,p[1]],[p[0],p[1]+9]],cc[i%5])}
  return {d:"",b:b};
};
S.church=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="",wf=P.glow?P.win:dk;
  b+=RC(0,90,110,110,P.walls[0])+RC(338,80,62,120,P.walls[2]);b+=wins(12,104,3,3,10,15,30,30,P,R);
  b+=RC(300,30,38,170,P.brick);for(var y=44;y<150;y+=28)b+=ARCH(308,y,10,18,wf,OP(.8))+ARCH(322,y,10,18,wf,OP(.8))+RC(298,y+22,42,3,mid);
  b+=PG([[296,30],[342,30],[319,8]],P.brick);
  b+=RC(110,74,190,126,hi)+PG([[104,74],[306,74],[205,40]],mid)+PG([[120,71],[290,71],[205,48]],hi);
  for(var k=0;k<4;k++)b+=RC(122+k*54,80,10,116,mid,OP(.75));
  b+=CI(205,110,16,mid)+CI(205,110,12,wf,OP(.8))+ARCH(192,150,26,46,wf,OP(.85))+RC(100,196,210,6,lo);
  b+=RC(0,200,400,40,P.ground)+people(R,6,20,380,212,232,dk);
  return {d:"",b:b};
};
S.gallery=function(P,id,R){
  var b=RC(0,0,400,240,"#7E2A31");
  for(var x=0;x<400;x+=24)for(var y=0;y<200;y+=24)b+=CI(x+12,y+12,3,"#8E343B");
  b+=RC(0,0,400,12,"#C9A14A")+RC(0,196,400,44,"#6B4428");for(x=0;x<400;x+=26)b+=LN(x,196,x-18,240,"#5A3820",1.2);
  var fr=function(x,y,w,h,s){var o=RC(x,y,w,h,"#C9A14A")+RC(x+5,y+5,w-10,h-10,"#B08A38")+RC(x+8,y+8,w-16,h-16,s[0]);o+=PA("M"+(x+8)+" "+(y+h-8)+"Q"+(x+w*.4)+" "+(y+h*.45)+" "+(x+w-8)+" "+(y+h*.62)+"V"+(y+h-8)+"Z",s[1])+CI(x+w*.7,y+h*.35,Math.min(w,h)*.08,s[2]);return o};
  b+=fr(28,40,96,70,["#9CC2D9","#56704A","#F6E3A5"])+fr(150,26,104,128,["#D8B27A","#7A4E33","#F2D9A2"])+fr(280,48,92,66,["#B9A9C9","#4F5E73","#F4E8C8"])+fr(40,126,70,50,["#E8CFA3","#8B5A3C","#FFF2CF"])+fr(290,124,76,52,["#A7C4A0","#3F5E44","#F7ECC8"]);
  b+=PG([[200,0],[150,196],[250,196]],"#FFF3C4",OP(.08));
  b+=RC(150,184,100,8,"#3B2A20")+RC(156,192,4,14,"#3B2A20")+RC(240,192,4,14,"#3B2A20");
  return {d:"",b:b};
};
S.gallery.noSky=true;
S.perspective=function(P,id,R){
  var st=P.stone,hi=st[0],mid=st[1],lo=st[2],dk=st[3],b="";
  b+=RC(0,0,400,240,mid);
  b+=PG([[0,240],[160,150],[240,150],[400,240]],P.groundL);
  for(var i=1;i<8;i++){var t=i/8;b+=LN(200-200*t,150+90*t,200+200*t,150+90*t,lo,1,OP(.4))}
  b+=LN(200,150,120,240,lo,1,OP(.4))+LN(200,150,280,240,lo,1,OP(.4));
  b+=RC(186,112,28,40,"#8FC0E0")+EL(200,146,14,6,P.veg)+RC(198,124,4,20,"#F2EEE6")+CI(200,122,2.4,"#F2EEE6");
  for(var k=7;k>=0;k--){var s=Math.pow(.8,k),H=170*s,dx=150*s,yb=150+90*s*1.0,cw=12*s;
    b+=RC(200-dx-cw/2,yb-H,cw,H,hi)+RC(200+dx-cw/2,yb-H,cw,H,hi)+RC(200-dx-cw/2,yb-H,cw*.3,H,lo,OP(.5))+RC(200+dx+cw*.2,yb-H,cw*.3,H,lo,OP(.5));
    b+=PA("M"+r1(200-dx)+" "+r1(yb-H)+"A"+r1(dx)+" "+r1(dx*.55)+" 0 0 1 "+r1(200+dx)+" "+r1(yb-H),"none",'stroke="'+lo+'" stroke-width="'+r1(4*s)+'"')}
  return {d:"",b:b};
};
S.ruins=function(P,id,R){
  var st=P.stone,mid=st[1],dk=st[3],b="",br=P.brick;
  b+=RC(0,170,400,70,P.grass);
  b+=pine(360,176,1.0,P.veg,P.vegD)+cypress(22,180,1,P.vegD);
  b+=PG([[40,196],[40,74],[58,66],[74,78],[92,60],[118,72],[134,64],[150,86],[150,196]],br)+ARCH(66,100,56,96,dk,OP(.7));
  b+=PG([[176,196],[176,48],[196,40],[214,52],[240,34],[268,50],[290,38],[312,56],[330,44],[340,62],[340,196]],br)+ARCH(196,76,50,120,dk,OP(.7))+ARCH(270,76,50,120,dk,OP(.7));
  for(var y=80;y<196;y+=12)b+=RC(40,y,110,1,dk,OP(.15))+RC(176,y,164,1,dk,OP(.15));
  b+=RC(0,196,400,44,P.groundL)+people(R,5,40,360,210,232,dk);
  for(var i=0;i<6;i++)b+=EL(20+R()*360,214+R()*20,8+R()*8,3,mid);
  return {d:"",b:b};
};
S.catacomb=function(P,id,R){
  var b=RC(0,0,400,240,"#231B17");
  for(var k=0;k<7;k++){var s=Math.pow(.8,k),w=260*s,h=230*s;b+=ARCH(200-w/2,236-h,w,h,k%2?"#3A2E26":"#4A3B30")}
  b+=ARCH(200-18,150,36,86,"#120D0B");
  for(var r=0;r<4;r++)for(var c=0;c<3;c++){b+=RC(46+c*22-r*2,56+r*34,16,14,"#120D0B",OP(.8))+RC(338-c*22+r*2-16,56+r*34,16,14,"#120D0B",OP(.8))}
  b+=CI(200,190,60,"#FFB65C",OP(.12))+CI(200,190,26,"#FFB65C",OP(.18))+RC(197,194,6,16,"#EFE6D2")+PA("M200 182q5 6 0 12q-5 -6 0 -12z","#FFCF6A");
  return {d:"",b:b};
};
S.catacomb.noSky=true;
S.appia=function(P,id,R){
  var b="";
  b+=RC(0,130,400,110,P.grass);
  b+=PA("M0 140Q200 120 400 140V150H0Z",P.veg,OP(.4));
  b+=RC(40,96,60,50,P.stone[1])+RC(36,90,68,8,P.stone[2]);for(var x=38;x<104;x+=8)b+=RC(x,84,5,7,P.stone[1]);
  b+=PG([[150,240],[250,240],[204,128],[196,128]],"#6E6962");
  for(var i=0;i<60;i++){var t=R(),y=128+112*t*t,hw=4+46*t*t,xx=200+(R()-.5)*2*hw;b+=EL(xx,y,2+6*t*t,1+3*t*t,"#8A857C",OP(.8))}
  [[.15,-1],[.3,1],[.5,-1],[.7,1],[.9,-1]].forEach(function(q){var t=q[0],y=128+112*t*t,x=200+q[1]*(20+120*t*t);b+=pine(x,y,.25+1.1*t,P.veg,P.vegD)});
  [[.25,1],[.6,-1]].forEach(function(q){var t=q[0],y=128+112*t*t,x=200+q[1]*(34+150*t*t);b+=cypress(x,y,.3+1.2*t,P.vegD)});
  return {d:"",b:b};
};
S.keyhole=function(P,id,R){
  var sk=P.glow?"#1E2A5A":"#BFE0F5",dm=P.glow?"#E8C98A":"#9CB0BA",hd=P.glow?"#0F1E18":"#2F5A37",pa=P.glow?"#3A3440":"#D8C8A2";
  var b=RC(0,0,400,240,"#E4D6BC")+RC(104,4,168,236,"#D2C09C")+RC(116,14,144,226,"#2E4A37");
  [[128,26,56,96],[192,26,56,96],[128,134,56,96],[192,134,56,96]].forEach(function(p){b+=RC(p[0],p[1],p[2],p[3],"none",'stroke="#46664F" stroke-width="3"')});
  for(var y=40;y<230;y+=24)[132,244].forEach(function(x){b+=CI(x,y,2,"#6F8A73")});
  b+=EL(188,128,22,34,"#B58D4A")+EL(188,128,18,30,"#C9A45E");
  var d='<clipPath id="'+id+'k"><circle cx="188" cy="118" r="8"/><polygon points="183,121 193,121 196,144 180,144"/></clipPath><clipPath id="'+id+'i"><circle cx="322" cy="84" r="54"/></clipPath>';
  b+='<g clip-path="url(#'+id+'k)">'+RC(170,100,40,50,sk)+PG([[170,100],[186,124],[170,150]],hd)+PG([[206,100],[190,124],[206,150]],hd)+DOME(188,125,4,4,dm)+'</g>';
  b+=LN(196,110,276,108,"#B58D4A",2);
  b+='<g clip-path="url(#'+id+'i)">'+RC(266,28,112,112,sk)+(P.glow?CI(360,50,1,"#FFFFFF")+CI(290,44,1,"#FFFFFF"):"")+PG([[266,28],[314,92],[266,140]],hd)+PG([[378,28],[330,92],[378,140]],hd)+PG([[298,140],[346,140],[326,98],[318,98]],pa)+RC(308,92,28,7,P.glow?"#F2D9A8":"#D9CFB9")+DOME(322,93,17,18,dm)+RC(319.5,70,5,6,dm)+CI(322,68,1.8,dm)+'</g>';
  b+=CI(322,84,54,"none",'stroke="#B58D4A" stroke-width="6"');
  return {d:d,b:b};
};
S.keyhole.noSky=true;
S.spiral=function(P,id,R){
  var d='<radialGradient id="'+id+'r"><stop offset="0" stop-color="#2A2018" stop-opacity=".8"/><stop offset=".55" stop-color="#2A2018" stop-opacity=".25"/><stop offset="1" stop-color="#2A2018" stop-opacity="0"/></radialGradient>';
  var b=RC(0,0,400,240,"#CFC6B8")+CI(200,120,118,"#B8AC9A")+CI(200,120,112,"#EAE2D5");
  var bb=.075,T=4*Math.PI*2,rr=function(t){return 110*Math.exp(-bb*t)},cx=200,cy=120,i;
  for(i=0;i<=T;i+=.1){var r0=rr(i),r2=rr(i+Math.PI*2);b+=LN(cx+r0*Math.cos(i),cy+r0*Math.sin(i),cx+r2*Math.cos(i),cy+r2*Math.sin(i),"#A89880",.8)}
  var pts=[];for(i=0;i<=T+Math.PI*2;i+=.05){var r=rr(i);pts.push(r1(cx+r*Math.cos(i))+","+r1(cy+r*Math.sin(i)))}
  b+='<polyline points="'+pts.join(" ")+'" fill="none" stroke="#6E5234" stroke-width="3.2"/>';
  b+='<polyline points="'+pts.join(" ")+'" fill="none" stroke="#D2AE72" stroke-width="1" transform="translate(-.8,-.8)"/>';
  b+=CI(cx,cy,118,"url(#"+id+"r)")+CI(cx,cy,14,"#4E3E30")+CI(cx,cy,7,"#8C7A62");
  return {d:d,b:b};
};
S.spiral.noSky=true;
/* ---------- getting around ---------- */
S.plane=function(P,id,R){
  var L=P.layers,b="";
  for(var x=0;x<400;x+=12){var h=6+R()*18;b+=RC(x,236-h,13,h+10,L[2]);if(P.glow&&R()<.7)b+=RC(x+3,238-h+R()*6,2,2.4,P.win)}
  var body=P.glow?"#353C5E":"#EEF2F6",wing=P.glow?"#2A3050":"#C9D2DC";
  b+='<g transform="rotate(-11 200 110)">'+PA("M110 110H300","none",'stroke="#FFFFFF" stroke-width="2" '+OP(P.glow?.12:.5))+PA("M60 104H150","none",'stroke="#FFFFFF" stroke-width="1.4" '+OP(P.glow?.1:.4))+
     PG([[196,112],[236,112],[178,154],[160,154]],wing)+PG([[204,108],[232,108],[196,78],[184,78]],wing)+EL(210,110,78,10,body)+PG([[134,104],[150,104],[130,76],[120,76]],wing)+PG([[136,110],[160,110],[132,122],[122,122]],wing);
  for(var k=0;k<14;k++)b+=CI(160+k*7.5,107,1.4,P.glow?"#FFD98A":"#56606C");
  b+=CI(170,154,2,"#FF5A5A")+CI(190,78,2,"#5AFF8A")+CI(286,110,1.8,"#FFFFFF")+'</g>';
  return {d:"",b:b};
};
S.train=function(P,id,R){
  var b="";
  b+=pine(40,180,.8,P.veg,P.vegD)+pine(110,184,.6,P.veg,P.vegD)+RC(330,70,10,110,"#D8D4CC")+RC(322,56,26,18,P.glow?"#FFE39A":"#9FB7C8")+RC(318,52,34,6,"#D8D4CC");
  b+=RC(0,180,400,60,P.ground);
  for(var x=0;x<400;x+=14)b+=RC(x,200,8,4,"#6E5E4E");
  b+=RC(0,196,400,2.5,"#9C9C9C")+RC(0,206,400,2.5,"#9C9C9C");
  var bd=P.glow?"#C9C9D2":"#EFEFEC";
  b+=PA("M24 140Q24 132 32 132H322Q356 134 372 166V184Q372 192 364 192H32Q24 192 24 184Z",bd);
  b+=RC(24,172,348,8,"#C8202F")+RC(34,144,282,18,P.glow?"#FFE39A":"#2B3440")+PA("M330 142H348L360 164H330Z",P.glow?"#FFE39A":"#2B3440");
  for(x=70;x<310;x+=56)b+=RC(x,142,3,22,bd)+RC(x+18,140,16,50,"#DADAD6")+RC(x+25,140,1.5,50,"#B8B8B4");
  for(x=40;x<370;x+=60)b+=CI(x,194,5,"#3A3A3A");
  for(var i=0;i<4;i++)b+=LN(4-i*2,146+i*12,18,146+i*12,P.glow?"#9FA7D8":"#FFFFFF",2,OP(.6));
  return {d:"",b:b};
};
S.bus=function(P,id,R){
  var b=RC(0,178,400,62,P.ground)+RC(0,200,400,2,P.groundL,OP(.6));
  for(var x=0;x<400;x+=28){var h=30+R()*50;b+=RC(x,178-h,29,h,P.layers[2]);if(P.glow)b+=RC(x+6,184-h,4,5,P.win)+RC(x+16,192-h,4,5,P.win)}
  var bd=P.glow?"#D8DCE8":"#F2F4F7";
  b+=PA("M40 110Q40 100 50 100H344Q364 100 366 120V180Q366 186 360 186H46Q40 186 40 180Z",bd)+RC(40,160,326,6,"#2F6FB3");
  for(x=56;x<330;x+=38)b+=RC(x,112,30,32,P.glow?"#FFE39A":"#34404E",'rx="3"');
  b+=RC(338,112,22,40,P.glow?"#FFE39A":"#34404E",'rx="3"')+CI(96,188,13,"#2A2A2E")+CI(96,188,5,"#8C8C92")+CI(316,188,13,"#2A2A2E")+CI(316,188,5,"#8C8C92");
  if(P.glow)b+=PG([[366,160],[400,150],[400,176]],"#FFF3C4",OP(.35));
  return {d:"",b:b};
};
S.taxi=function(P,id,R){
  var b=RC(0,178,400,62,P.ground);
  for(var x=0;x<400;x+=30){var h=36+R()*60;b+=RC(x,178-h,31,h,P.layers[2]);if(P.glow){b+=RC(x+6,186-h,4,5,P.win)+RC(x+18,196-h,4,5,P.win)}}
  b+=RC(0,196,400,3,"#FFFFFF",OP(.25));
  var bd="#F4F4F2";
  b+=PA("M86 160Q90 140 112 136L150 118Q166 110 190 110H244Q262 110 276 122L300 138Q330 140 336 158V176Q336 184 328 184H92Q84 184 84 176Z",bd);
  b+=PA("M160 124Q170 116 190 116H214V136H148Z",P.glow?"#2B3150":"#3B4756")+PA("M220 116H244Q256 116 266 126L276 136H220Z",P.glow?"#2B3150":"#3B4756");
  b+=RC(196,98,40,12,"#F4F4F2",'rx="2"')+'<text x="216" y="107.5" text-anchor="middle" font-size="8.5" font-weight="700" font-family="Arial,sans-serif" fill="#1B1B1B">TAXI</text>';
  b+=CI(130,184,15,"#232326")+CI(130,184,6,"#9A9AA0")+CI(292,184,15,"#232326")+CI(292,184,6,"#9A9AA0");
  if(P.glow)b+=PG([[336,160],[400,150],[400,178]],"#FFF3C4",OP(.35))+CI(334,158,3,"#FFF3C4");
  return {d:"",b:b};
};
/* ---------- nights & places ---------- */
S.stadium=function(P,id,R){
  var b=PA("M0 120Q120 90 230 108T400 100V240H0Z",P.veg);
  b+=EL(200,164,184,66,"#D9D6D0")+EL(200,160,166,56,"#86BCE3");
  for(var i=0;i<4;i++)b+=EL(200,160,166-i*14,56-i*5,"none",'stroke="#FFFFFF" stroke-width="1" '+OP(.45));
  for(i=0;i<140;i++){var a=R()*Math.PI*2,rx=120+R()*44,ry=38+R()*16;b+=CI(200+rx*Math.cos(a),160+ry*Math.sin(a),1.1,R()<.5?"#FFFFFF":"#2F6FB3",OP(.8))}
  b+=EL(200,162,112,34,"#4E9A4A");for(i=0;i<8;i++)b+=RC(94+i*27,130,13.5,64,"#5BAA55",OP(.55));
  b+=EL(200,162,112,34,"none",'stroke="#FFFFFF" stroke-width="1.4"')+LN(200,128,200,196,"#FFFFFF",1.2)+EL(200,162,16,6,"none",'stroke="#FFFFFF" stroke-width="1.2"');
  b+=EL(200,150,178,60,"none",'stroke="#F4F4F4" stroke-width="9" '+OP(.85));
  [[40,120],[360,120],[120,96],[280,96]].forEach(function(p){if(P.glow)b+=CI(p[0],p[1],16,"#FFFBE0",OP(.3));b+=CI(p[0],p[1],4,"#FFFBE0")});
  return {d:"",b:b};
};
S.theatre=function(P,id,R){
  var b=RC(0,0,400,240,"#3A0D14");
  for(var r=0;r<4;r++)for(var c=0;c<13;c++){var x=6+c*30.5,y=12+r*36;b+=ARCH(x,y,24,30,"#1E0609")+ARCH(x,y,24,30,"none",'stroke="#D4AF37" stroke-width="1.4"')+CI(x+12,y+16,1.6,"#FFD98A")}
  b+=RC(96,112,208,128,"#D4AF37")+RC(108,124,184,116,"#120406");
  b+=PA("M108 124H200Q170 180 150 240H108Z","#A3162B")+PA("M292 124H200Q230 180 250 240H292Z","#A3162B");
  for(var k=0;k<5;k++)b+=LN(116+k*8,128,112+k*10,240,"#7A0F20",1.4)+LN(284-k*8,128,288-k*10,240,"#7A0F20",1.4);
  for(k=0;k<8;k++)b+=PA("M"+(108+k*23)+" 124q11.5 14 23 0z","#8E1426");
  b+=PG([[200,0],[168,240],[232,240]],"#FFF3C4",OP(.12))+EL(200,232,40,6,"#FFF3C4",OP(.25));
  return {d:"",b:b};
};
S.theatre.noSky=true;
S.club=function(P,id,R){
  var d='<linearGradient id="'+id+'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16082A"/><stop offset="1" stop-color="#3A0F4F"/></linearGradient>';
  var b=RC(0,0,400,240,"url(#"+id+"g)");
  var cs=["#B06CFF","#FF4FB8","#4FE3FF"];
  for(var i=0;i<18;i++)b+=LN(200,34,R()*400,150+R()*90,cs[i%3],1.3,OP(.55));
  b+=CI(80,90,50,"#FF4FB8",OP(.12))+CI(330,80,60,"#4FE3FF",OP(.1));
  b+=CI(200,32,14,"#D5D8E4");for(var k=-2;k<=2;k++)b+=LN(186,32+k*5,214,32+k*5,"#9CA0B0",.6)+LN(200+k*5,18,200+k*5,46,"#9CA0B0",.6);
  b+=RC(146,150,108,44,"#0C0612")+RC(154,146,92,6,"#1E1030")+CI(200,126,10,"#0C0612")+PA("M178 150Q200 128 222 150Z","#0C0612")+PA("M189 124Q200 110 211 124","none",'stroke="#0C0612" stroke-width="3"');
  for(i=0;i<26;i++){var x=R()*400,y=202+R()*30,r=8+R()*4;b+=CI(x,y,r,"#07030D");if(R()<.3)b+=LN(x+r*.6,y-r,x+r+6,y-r-22,"#07030D",4)}
  b+=RC(0,226,400,14,"#07030D");
  return {d:d,b:b};
};
S.club.noSky=true;
S.crawl=function(P,id,R){
  var b=RC(0,0,400,240,"#4A2A1C");
  for(var s=0;s<3;s++){var y=40+s*42;b+=RC(0,y,400,5,"#2E1A12");for(var x=6;x<394;x+=12+R()*8){var h=14+R()*16,c=["#3E7A45","#8A2F2A","#D9A441","#E8E1D0","#5A3E8C","#2F5FA3"][(R()*6)|0];b+=RC(x,y-h,7,h,c,'rx="2"')+RC(x+2,y-h-5,3,6,c)}}
  b+=bulbs(catenary(0,14,400,14,26),16,{glow:true},"#FFD27A");
  b+=RC(0,166,400,74,"#6B3E24")+RC(0,162,400,8,"#8A5634");
  var mug=function(cx,rot){return '<g transform="rotate('+rot+' '+cx+' 150)">'+RC(cx-26,112,52,64,"#F2B33D",'rx="6"')+RC(cx-26,112,52,64,"#FFFFFF",'rx="6" fill-opacity=".18" stroke="#FFF3D0" stroke-width="2"')+CI(cx-16,110,11,"#FFF8E8")+CI(cx,106,13,"#FFF8E8")+CI(cx+16,110,11,"#FFF8E8")+PA("M"+(cx+26)+" 124q20 0 20 20t-20 20","none",'stroke="#FFF3D0" stroke-width="5"')+'</g>'};
  b+=mug(170,-12)+mug(236,12);
  for(var i=0;i<8;i++)b+=CI(190+R()*30,96+R()*20,1.5+R()*2,"#FFE08A");
  return {d:"",b:b};
};
S.crawl.noSky=true;
S.hostel=function(P,id,R){
  var b=RC(0,0,400,240,"#EFC75E");
  b+=RC(300,30,80,70,"#2A2F52")+RC(296,26,88,78,"none",'stroke="#FFFFFF" stroke-width="6"')+LN(340,26,340,104,"#FFFFFF",3);
  for(var i=0;i<10;i++)b+=RC(304+R()*70,70+R()*26,2,3,"#FFD98A");
  var pc=["#C8423A","#2F7A55","#2F5FA3","#6B4F8C","#E07A2E"],c=catenary(0,18,280,14,18);b+=PA(c.d,"none",'stroke="#6B5A3A" stroke-width="1"');
  for(i=1;i<12;i++){var p=c.pt(i/12);b+=PG([[p[0]-7,p[1]],[p[0]+7,p[1]],[p[0],p[1]+14]],pc[i%5])}
  var bunk=function(x){var o=RC(x,50,6,164,"#3B3B45")+RC(x+104,50,6,164,"#3B3B45")+RC(x,92,110,6,"#3B3B45")+RC(x,170,110,6,"#3B3B45");
    o+=RC(x+6,80,98,13,"#F4F1EA")+RC(x+40,78,64,15,pc[(x/7|0)%5])+RC(x+10,76,24,9,"#FFFFFF",'rx="4"');
    o+=RC(x+6,158,98,13,"#F4F1EA")+RC(x+40,156,64,15,pc[(x/5|0)%5])+RC(x+10,154,24,9,"#FFFFFF",'rx="4"');
    for(var k=0;k<5;k++)o+=RC(x+106,104+k*14,12,3,"#3B3B45");return o};
  b+=bunk(24)+bunk(158);
  b+=RC(0,214,400,26,"#8A6246");
  b+=RC(300,116,82,98,"#8B97A3");for(i=0;i<3;i++)b+=RC(300+i*27.3,116,1.5,98,"#6F7B87")+RC(318+i*27.3-10,140,4,6,"#C9A14A");
  return {d:"",b:b};
};
S.hostel.noSky=true;
S.aperitivo=function(P,id,R){
  var L=P.layers,b="";
  b+=RC(0,150,400,40,L[1])+DOME(90,150,24,26,L[1])+DOME(250,150,14,14,L[1])+RC(330,120,10,34,L[1]);
  b+=RC(0,176,400,6,"#3A302A");for(var x=4;x<400;x+=14)b+=RC(x,182,5,24,"#3A302A");b+=RC(0,204,400,36,"#6B5A4E");
  b+=EL(200,214,130,18,"#F4F1EA")+EL(200,218,130,14,"#000000",OP(.08));
  var glass=function(cx){var o=PA("M"+(cx-22)+" 130Q"+(cx-24)+" 170 "+cx+" 172Q"+(cx+24)+" 170 "+(cx+22)+" 130Z","#FFFFFF",'fill-opacity=".25" stroke="#FFFFFF" stroke-width="1.5"');
    o+=PA("M"+(cx-21)+" 140Q"+(cx-22)+" 168 "+cx+" 170Q"+(cx+22)+" 168 "+(cx+21)+" 140Z","#F26B1D",OP(.9));
    o+=RC(cx-10,146,9,9,"#FFFFFF",OP(.45))+RC(cx+2,150,9,9,"#FFFFFF",OP(.4))+PA("M"+(cx+8)+" 136a12 12 0 0 1 24 0z","#F8A13C")+LN(cx+6,120,cx-2,168,"#F2F2F2",2);
    o+=RC(cx-1.5,172,3,34,"#FFFFFF",OP(.6))+EL(cx,208,16,3.5,"#FFFFFF",OP(.6));return o};
  b+=glass(168)+glass(236)+EL(300,208,20,6,"#E8E0D0")+CI(294,204,4,"#556B2F")+CI(302,203,4,"#556B2F")+CI(306,207,4,"#6B7F3A");
  return {d:"",b:b};
};
/* ---------- food ---------- */
function bg(kind,id){
  var d="",b="";
  if(kind==="check"){d='<pattern id="'+id+'p" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#F4EEE6"/><rect width="18" height="18" fill="#C8423A"/><rect x="18" y="18" width="18" height="18" fill="#C8423A"/><rect width="36" height="18" fill="#C8423A" fill-opacity=".35"/></pattern>';b=RC(0,0,400,240,"url(#"+id+"p)")}
  else if(kind==="marble"){b=RC(0,0,400,240,"#ECE8E1")+PA("M0 60Q120 40 190 90T400 70","none",'stroke="#D3CCC1" stroke-width="2"')+PA("M0 190Q150 160 260 200T400 180","none",'stroke="#D8D1C6" stroke-width="1.5"')+PA("M80 0Q120 110 60 240","none",'stroke="#DDD6CC" stroke-width="1.2"')}
  else if(kind==="wood"){b=RC(0,0,400,240,"#9B6B43");for(var y=10;y<240;y+=18)b+=PA("M0 "+y+"Q200 "+(y+8)+" 400 "+(y-4),"none",'stroke="#86593A" stroke-width="2"')}
  else if(kind==="paper"){b=RC(0,0,400,240,"#E4D2B2")}
  else if(kind==="slate"){b=RC(0,0,400,240,"#30353A")}
  return {d:d,b:b};
}
function Z(k,dish){return '<g transform="translate(200 122) scale('+k+') translate(-200 -122)">'+dish+'</g>'}
function plate(){return EL(206,132,132,76,"#000000",OP(.12))+EL(200,124,132,76,"#FBF8F3")+EL(200,124,104,58,"none",'stroke="#E7E0D5" stroke-width="2"')}
function nest(R,c1,c2,n){var o="";for(var i=0;i<n;i++){var cx=200+(R()-.5)*30,cy=118+(R()-.5)*16,rx=34+R()*30,ry=16+R()*14;o+=EL(cx,cy,rx,ry,"none",'stroke="'+(i%3?c1:c2)+'" stroke-width="3.2"')}return o}
function dots(R,n,x0,x1,y0,y1,c,r){var o="";for(var i=0;i<n;i++)o+=CI(x0+R()*(x1-x0),y0+R()*(y1-y0),r||1.2,c);return o}
S.rigatoni=function(P,id,R){var g=bg("check",id),b=g.b+plate()+EL(200,120,84,42,"#C9472A",OP(.9));
  for(var i=0;i<46;i++){var a=R()*180,rr=Math.sqrt(R()),th=R()*6.283,cx=200+rr*72*Math.cos(th),cy=118+rr*34*Math.sin(th);b+='<g transform="rotate('+r1(a)+' '+r1(cx)+' '+r1(cy)+')">'+RC(cx-15,cy-6.5,30,13,"#DC6232",'rx="6.5"')+LN(cx-10,cy-2.6,cx+10,cy-2.6,"#B8431F",1.1)+LN(cx-10,cy+2.6,cx+10,cy+2.6,"#B8431F",1.1)+EL(cx+15,cy,3,6.5,"#86301A")+'</g>'}
  for(i=0;i<10;i++){var x=150+R()*100,y=96+R()*46;b+=RC(x,y,11,7,"#F3D9C9",'rx="1.5"')+RC(x,y,11,2.4,"#C9624A")}
  b+=dots(R,50,130,270,86,152,"#FFFFFF",1.2);return {d:g.d,b:b}};
S.carbonara=function(P,id,R){var g=bg("check",id),b=g.b+plate()+EL(200,120,70,34,"#F0CD7A")+nest(R,"#F2C35A","#E6B04A",44);
  for(var i=0;i<10;i++){var x=150+R()*100,y=98+R()*40;b+=RC(x,y,8,6,"#E9C3A6",'rx="1.5"')+RC(x,y+4,8,2,"#B5563C")}
  b+=dots(R,60,140,260,94,146,"#2B2420",1.2);return {d:g.d,b:b}};
S.cacio=function(P,id,R){var g=bg("check",id),b=g.b+plate()+EL(200,120,70,34,"#F6E6BE")+nest(R,"#F3DDA0","#EACB84",44)+dots(R,20,150,250,100,140,"#FFFDF6",3)+dots(R,90,140,260,92,148,"#2B2420",1.2);return {d:g.d,b:b}};
S.lasagna=function(P,id,R){var g=bg("check",id),b=g.b+plate();
  b+=PG([[140,112],[256,104],[268,120],[152,128]],"#C9702F");
  var ly=["#F5D78E","#B9442C","#F2E4C0","#F5D78E","#B9442C","#F2E4C0","#F5D78E"];
  ly.forEach(function(c,i){b+=PG([[152,128+i*5],[268,120+i*5],[268,125+i*5],[152,133+i*5]],c)});
  b+=PG([[140,112],[152,128],[152,163],[140,146]],"#B9442C",OP(.7));b+=dots(R,20,150,260,106,124,"#8E4A1E",1.4);return {d:g.d,b:b}};
S.suppli=function(P,id,R){var g=bg("paper",id),b=""+RC(70,40,260,160,"#F4EEE2",'transform="rotate(-4 200 120)"');
  b+=EL(150,130,46,27,"#C07A34")+dots(R,70,110,190,108,152,"#9A5A22",1.3);
  b+=EL(262,122,42,25,"#C07A34")+EL(268,120,30,17,"#E0782F")+dots(R,40,242,294,108,132,"#C95E22",1.5)+dots(R,40,226,300,100,144,"#9A5A22",1.2);
  b+=PA("M270 118Q300 96 334 112","none",'stroke="#FFF7E6" stroke-width="5" stroke-linecap="round"')+CI(270,118,6,"#FFF7E6");return {d:g.d,b:g.b+Z(1.3,b)}};
S.taglio=function(P,id,R){var g=bg("paper",id),b="";
  b+=RC(92,70,120,82,"#E3B06A",'rx="6"')+RC(98,76,108,70,"#D8452E",'rx="4"');
  for(var i=0;i<9;i++)b+=EL(104+R()*96,82+R()*56,7+R()*4,5+R()*3,"#FFF6E6");
  for(i=0;i<6;i++)b+=EL(106+R()*92,84+R()*52,5,2.6,"#2F7A3A",'transform="rotate('+r1(R()*180)+' '+r1(150)+' '+r1(110)+')"');
  b+=RC(222,92,110,76,"#E8C27A",'rx="6"');for(i=0;i<9;i++)b+=CI(234+R()*86,102+R()*56,8,"#F4E3B5")+CI(234+R()*86,102+R()*56,.8,"#8A6A3A");
  for(i=0;i<8;i++)b+=LN(232+R()*88,100+R()*60,238+R()*88,104+R()*60,"#4E6B3A",1.4);return {d:g.d,b:g.b+Z(1.3,b)}};
S.tonda=function(P,id,R){var g=bg("wood",id),b=g.b+CI(200,122,96,"#D8C7AE")+CI(200,120,86,"#E3A152")+CI(200,120,74,"#D2402A");
  for(var i=0;i<14;i++){var a=R()*6.28,r=R()*60;b+=EL(200+r*Math.cos(a),120+r*Math.sin(a),9,7,"#FFF6E6")}
  for(i=0;i<8;i++){a=R()*6.28;r=R()*56;b+=EL(200+r*Math.cos(a),120+r*Math.sin(a),6,3,"#2F7A3A")}
  for(i=0;i<16;i++){a=R()*6.28;b+=CI(200+80*Math.cos(a),120+80*Math.sin(a),2,"#7A4A24")}return {d:g.d,b:b}};
S.trapizzino=function(P,id,R){var g=bg("paper",id),b="";
  b+=PG([[118,200],[222,200],[170,70]],"#E6B46E")+PG([[126,196],[216,196],[170,82]],"#EDC27E")+EL(170,84,34,12,"#B24E2A")+dots(R,10,148,192,78,90,"#F2D9B8",3);
  b+=PG([[214,206],[318,206],[266,84]],"#E0AA62")+PG([[222,202],[310,202],[266,96]],"#E9BC76")+EL(266,98,32,11,"#7A3A22")+dots(R,8,246,288,92,104,"#3F6B3A",2.4);
  b+=PG([[112,206],[228,206],[214,168],[126,168]],"#FFFFFF",OP(.9))+PG([[208,210],[324,210],[310,174],[222,174]],"#FFFFFF",OP(.9));return {d:g.d,b:g.b+Z(1.22,b)}};
S.tiramisu=function(P,id,R){var g=bg("marble",id),b="";
  b+=EL(200,202,62,10,"#000000",OP(.1))+PA("M142 70H258L248 200H152Z","#FFFFFF",'fill-opacity=".35" stroke="#FFFFFF" stroke-width="2"');
  [["#9C6232",176,24],["#F4E7CF",152,24],["#A8693A",130,22],["#F4E7CF",100,30]].forEach(function(l){var y=l[1],h=l[2];b+=PG([[146+(200-y)*.08,y],[254-(200-y)*.08,y],[254-(200-y-h)*.08,y+h],[146+(200-y-h)*.08,y+h]],l[0])});
  b+=PG([[148,88],[252,88],[251,100],[149,100]],"#6B4226")+dots(R,50,150,250,86,98,"#4A2C16",1);
  b+=PA("M268 60L312 188","none",'stroke="#C9CDD2" stroke-width="5" stroke-linecap="round"')+EL(266,54,8,14,"#D9DDE2",'transform="rotate(-20 266 54)"');return {d:g.d,b:g.b+Z(1.1,b)}};
S.gelato=function(P,id,R){var g=bg("marble",id),b="",d=g.d;
  d+='<clipPath id="'+id+'c"><polygon points="170,128 230,128 200,222"/></clipPath>';
  b+=PG([[170,128],[230,128],[200,222]],"#D79B4E");var w="";for(var k=-6;k<8;k++)w+=LN(150+k*10,120,210+k*10,230,"#B97B34",1.4)+LN(250-k*10,120,190-k*10,230,"#B97B34",1.4);
  b+='<g clip-path="url(#'+id+'c)">'+w+'</g>';
  b+=CI(186,116,30,"#B3B070")+PA("M156 120q30 16 60 0","#A3A060")+CI(216,94,28,"#F6F1E6")+dots(R,26,196,238,78,112,"#3A2A20",1.4)+PA("M240 140L286 96","none",'stroke="#C9CDD2" stroke-width="7" stroke-linecap="round"');return {d:d,b:g.b+Z(1.22,b)}};
S.espresso=function(P,id,R){var g=bg("marble",id),b="";
  b+=EL(200,176,84,20,"#000000",OP(.08))+EL(200,170,80,18,"#FFFFFF")+EL(200,168,60,12,"#EFEBE4");
  b+=PA("M156 116H244Q244 164 200 166Q156 164 156 116Z","#FFFFFF",'stroke="#E2DCD2" stroke-width="1.5"')+PA("M243 124q24 0 22 18t-26 12","none",'stroke="#FFFFFF" stroke-width="7"');
  b+=EL(200,116,44,9,"#F4F0EA")+EL(200,117,38,7,"#C38A4B")+EL(200,117,30,5,"#D9A36A");
  b+=PA("M188 100q-8 -12 0 -24t0 -24M204 98q-8 -12 0 -24t0 -24M220 100q-8 -12 0 -24","none",'stroke="#FFFFFF" stroke-width="2.4" '+OP(.7));
  b+=LN(252,176,300,160,"#C9CDD2",4)+RC(90,150,40,24,"#C8423A",'transform="rotate(-18 110 162)" rx="2"');return {d:g.d,b:g.b+Z(1.15,b)}};
S.maritozzo=function(P,id,R){var g=bg("marble",id),b=g.b;
  b+=EL(206,176,96,16,"#000000",OP(.1))+EL(200,140,92,44,"#C88A48")+EL(200,132,86,36,"#D69A55");
  b+=PA("M118 128Q200 84 282 128Q200 150 118 128Z","#FFF9EE")+PA("M126 130Q200 100 274 130","none",'stroke="#F2E6D2" stroke-width="2"')+EL(200,112,70,12,"#D69A55");
  b+=dots(R,80,120,280,96,150,"#FFFFFF",1.3);return {d:g.d,b:b}};
S.spritz=function(P,id,R){var g=bg("wood",id),b=g.b;
  b+=EL(200,212,40,7,"#000000",OP(.15))+PA("M160 60Q156 140 200 150Q244 140 240 60Z","#FFFFFF",'fill-opacity=".25" stroke="#FFFFFF" stroke-width="2"');
  b+=PA("M161 84Q158 140 200 148Q242 140 239 84Z","#F26B1D",OP(.92))+RC(176,96,16,16,"#FFFFFF",OP(.45))+RC(200,104,16,16,"#FFFFFF",OP(.4))+RC(186,118,14,14,"#FFFFFF",OP(.35));
  b+=PA("M222 72a22 22 0 0 1 40 12z","#F8A13C")+PA("M228 74a16 16 0 0 1 28 9z","#FFD08A")+LN(214,40,188,146,"#E8E8E8",3);
  b+=RC(197,150,6,56,"#FFFFFF",OP(.6))+EL(200,208,30,6,"#FFFFFF",OP(.6));return {d:g.d,b:b}};
S.panino=function(P,id,R){var g=bg("wood",id),b=g.b+EL(200,168,130,30,"#C9A57A");
  b+=PA("M100 150Q200 176 300 150L296 166Q200 190 104 166Z","#D8A05A")+PA("M104 148Q200 170 296 148Q290 136 200 132Q110 136 104 148Z","#7A3B26")+dots(R,30,110,290,134,152,"#5A2A18",2)+PA("M110 140Q200 158 290 140","none",'stroke="#4E8A3A" stroke-width="4"');
  b+=PA("M100 138Q104 92 200 88Q296 92 300 138Q200 150 100 138Z","#E0AC62")+dots(R,30,130,270,96,126,"#F4E2C0",1.4);return {d:g.d,b:b}};
S.pizzabianca=function(P,id,R){var g=bg("paper",id),b=g.b;
  b+=RC(60,82,280,86,"#E8C07A",'rx="30"')+RC(66,88,268,74,"#EDCB8A",'rx="26"');
  for(var i=0;i<22;i++)b+=EL(80+R()*240,96+R()*58,5+R()*10,3+R()*6,"#F4DDA6");
  b+=dots(R,70,76,324,92,158,"#FFFFFF",1.2)+RC(80,94,240,30,"#FFFFFF",'rx="15" opacity=".12"');return {d:g.d,b:b}};
["rigatoni","carbonara","cacio","lasagna","suppli","taglio","tonda","trapizzino","tiramisu","gelato","espresso","maritozzo","spritz","panino","pizzabianca"].forEach(function(k){S[k].noSky=true});

function todFromMin(m){var x=((m%1440)+1440)%1440;if(x<390)return"night";if(x<420)return"blue";if(x<480)return"dawn";if(x<990)return"day";if(x<1095)return"golden";if(x<1135)return"sunset";if(x<1165)return"blue";return"night"}
function draw(key,tod,label){
  var fn=S[key]||S.church,P=TOD[tod]||TOD.day,id="a"+(++UID),R=rng(hash(key+tod)),W=fn.W||400,H=fn.H||240;
  var sc=fn(P,id,R);
  var sky=fn.noSky?"":skyBody(P,id,W,H,rng(hash(key+tod+"s")),fn.sun&&(P.name==="sunset"||P.name==="golden")?fn.sun:null);
  return '<svg class="art" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="'+(fn.align||"xMidYMid")+' slice" role="img" aria-label="'+(label||"").replace(/"/g,"&quot;")+'" focusable="false"><defs>'+(fn.noSky?"":skyDefs(P,id))+sc.d+'</defs>'+sky+sc.b+'</svg>';
}
return {draw:draw,tod:todFromMin,keys:Object.keys(S),TOD:TOD};
})();

export const drawScene: (key: string, tod?: string, label?: string) => string = ART.draw
export const todFromMinutes: (minutes: number) => string = ART.tod
export const sceneKeys: string[] = ART.keys
