import { useEffect, useRef, useState } from 'react';
import avatarOrb from '../assets/brand/avatar-orb.png';
import { gsap, reducedMotion } from '../motion';

/**
 * Mitra's button: a glass ball with slow plasma drifting inside it. The colours are the design's teal (taken from avatar-orb.png);
 * only the movement is new. It is one small WebGL shader on a canvas, driven by gsap.ticker like every other animation here.
 * No WebGL, or reduced motion: the still picture from the design (reduced motion still gets one painted frame).
 */

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform float e;
mat3 rot(vec3 a){float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
  return mat3(cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy);}
float sheet(vec3 p,mat3 R,float ph){vec3 q=R*p;return q.z+.42*sin(q.x*2.1+ph)*cos(q.y*1.6-ph*.7)+.22*sin(q.y*2.6+ph*1.3);}
void main(){
  float m=min(r.x,r.y);
  vec2 uv=(gl_FragCoord.xy*2.-r)/m;
  float d=length(uv);
  float mask=1.-smoothstep(1.-2./m,1.,d);
  if(mask<=0.){gl_FragColor=vec4(0.);return;}
  float zf=sqrt(max(0.,1.-d*d));
  mat3 R1=rot(vec3(t*.31,t*.23,t*.17)),R2=rot(vec3(1.7-t*.19,.6+t*.27,2.1-t*.21));
  float a1=0.,a2=0.;
  float j=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  for(int i=0;i<40;i++){
    vec3 p=vec3(uv,mix(-zf,zf,(float(i)+j)/40.));
    a1+=exp(-abs(sheet(p,R1,t*1.1))*24.);
    a2+=exp(-abs(sheet(p,R2,t*.9+2.))*24.);
  }
  a1*=zf/20.;a2*=zf/20.;
  float b1=1.-exp(-a1*6.),b2=1.-exp(-a2*6.);
  vec3 deep=vec3(.02,.17,.16),aqua=vec3(.30,.78,.72),teal=vec3(.06,.45,.42),glow=vec3(.62,1.,.95);
  vec3 col=deep*(.55+.45*zf);
  col+=aqua*b1*.85+teal*b2*.8;
  col+=glow*(pow(b1,5.)*.9+pow(b2,5.)*.6)*(.8+.4*e);
  float fr=pow(1.-zf,2.5);
  float hue=.5+.5*sin(atan(uv.y,uv.x)*2.+t*.8);
  col+=mix(vec3(.18,.72,.62),vec3(.35,.95,.88),hue)*fr*1.3;
  col+=glow*smoothstep(.93,1.,d)*.35;
  gl_FragColor=vec4(min(col,1.)*mask,mask);
}`;

export function AgentOrb({ live }: { live: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const energy = useRef({ e: 0 });
  const [gl, setGl] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!cv || !ctx) return;
    const g = ctx;
    const sh = (type: number, src: string) => { const x = g.createShader(type)!; g.shaderSource(x, src); g.compileShader(x); return x; };
    const prog = g.createProgram()!;
    g.attachShader(prog, sh(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) return;
    g.useProgram(prog);
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(prog, 'p');
    g.enableVertexAttribArray(loc);
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    const uR = g.getUniformLocation(prog, 'r'), uT = g.getUniformLocation(prog, 't'), uE = g.getUniformLocation(prog, 'e');

    let time = 4; // a pleasant starting frame, and the one reduced motion keeps
    const draw = () => {
      g.viewport(0, 0, cv.width, cv.height);
      g.uniform2f(uR, cv.width, cv.height);
      g.uniform1f(uT, time);
      g.uniform1f(uE, energy.current.e);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    };
    const size = () => {
      const px = Math.max(1, Math.round(cv.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
      if (cv.width !== px) { cv.width = px; cv.height = px; }
      draw();
    };
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    size();
    setGl(true);

    const tick = (_: number, ms: number) => { time += (ms / 1000) * 0.7 * (1 + energy.current.e * 1.5); draw(); };
    const animate = !reducedMotion();
    if (animate) gsap.ticker.add(tick);
    return () => {
      if (animate) gsap.ticker.remove(tick);
      ro.disconnect();
      setGl(false);
    };
  }, []);

  // Faster, brighter plasma while Mitra is listening or thinking.
  useEffect(() => { gsap.to(energy.current, { e: live ? 1 : 0, duration: 0.5, overwrite: true }); }, [live]);

  return (
    <>
      {!gl && <img className="agent-orb agent-orb-still" src={avatarOrb} alt="" width={60} height={60} />}
      <canvas ref={canvas} className="agent-orb" aria-hidden style={gl ? undefined : { visibility: 'hidden' }} />
    </>
  );
}
