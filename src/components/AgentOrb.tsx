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
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
  float m=min(r.x,r.y);
  vec2 uv=(gl_FragCoord.xy*2.-r)/m;
  float d=length(uv);
  float aa=2./m;
  float mask=1.-smoothstep(1.-aa,1.,d);
  if(mask<=0.){gl_FragColor=vec4(0.);return;}
  float z=sqrt(max(0.,1.-d*d));
  float s=t*.16;
  vec2 q=uv*.85+vec2(cos(s),sin(s*1.3))*.6;
  vec2 w=vec2(fbm(q+s),fbm(q+5.2-s));
  float f=fbm(q+2.*w);
  float ridge=pow(1.-abs(2.*fbm(q*1.1+w*1.4+s*.7)-1.),12.);
  vec3 deep=vec3(.02,.19,.18),mid=vec3(.04,.28,.26),aqua=vec3(.30,.69,.65),glow=vec3(.39,.98,.92);
  vec3 col=mix(deep,mid,smoothstep(.25,.7,f));
  col=mix(col,aqua*.9,smoothstep(.5,.9,fbm(q*.7-w))*.7);
  col+=glow*ridge*(.45+.5*e);
  float lit=clamp(.5+.55*dot(normalize(vec3(uv,z)),normalize(vec3(-.5,.6,.6))),0.,1.);
  col*=lit;
  float fr=pow(1.-z,2.4);
  col+=vec3(.13,.44,.42)*fr*(1.1+.5*sin(atan(uv.y,uv.x)*2.+s*3.));
  gl_FragColor=vec4(col*mask,mask);
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

    const tick = (_: number, ms: number) => { time += (ms / 1000) * (1 + energy.current.e * 2.5); draw(); };
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
