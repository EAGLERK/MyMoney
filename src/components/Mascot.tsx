import happy from '../assets/brand/mascot-happy.svg?raw';
import anxious from '../assets/brand/mascot-anxious.svg?raw';
import angry from '../assets/brand/mascot-angry.svg?raw';
import left from '../assets/brand/mascot-left.svg?raw';
import right from '../assets/brand/mascot-right.svg?raw';
import winkLeft from '../assets/brand/mascot-wink-left.svg?raw';
import winkRight from '../assets/brand/mascot-wink-right.svg?raw';

export type Mood = 'happy' | 'anxious' | 'angry' | 'left' | 'right' | 'wink-left' | 'wink-right';
const FACES: Record<Mood, string> = { happy, anxious, angry, left, right, 'wink-left': winkLeft, 'wink-right': winkRight };

/** The M from the logo with eyes, as drawn on the brand page. The body takes the accent colour; the eyes keep their own. */
export function Mascot({ mood = 'happy', size = 36 }: { mood?: Mood; size?: number }) {
  return <span className="mascot" aria-hidden style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: FACES[mood] }} />;
}
