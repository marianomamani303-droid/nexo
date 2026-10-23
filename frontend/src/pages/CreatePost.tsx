import { Link } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Image, MessageSquare, Fingerprint } from 'lucide-react';
import { Composer } from '../components/Composer';
import { PageHeading } from '../components/PageHeading';
import { AnimatedRegion } from '../components/AnimatedRegion';
export function CreatePost() {
  return (
    <AnimatedRegion identity="create">
      <Link className="back-link" to="/">
        <ArrowLeft size={15} />
        Volver a tu inicio
      </Link>
      <PageHeading
        eyebrow="DALE LUGAR A TU VOZ"
        title={
          <>
            Lo que pensás puede
            <br />
            abrir una <em>conversación.</em>
          </>
        }
        description="Una idea, un proyecto, una pregunta. Empezá por compartir."
      />
      <section className="card full-composer" data-reveal>
        <div className="editor-heading">
          <span>
            <Fingerprint size={18} />
            TU PRÓXIMA PUBLICACIÓN
          </span>
          <span>UN ESPACIO ABIERTO</span>
        </div>
        <Composer expanded />
      </section>
      <div className="writing-tips" data-scroll>
        <h2>Las buenas ideas no necesitan ser perfectas.</h2>
        <div>
          <article>
            <Lightbulb size={20} />
            <h3>Contá el porqué</h3>
            <p>El contexto hace que una idea encuentre a las personas correctas.</p>
          </article>
          <article>
            <Image size={20} />
            <h3>Mostrá el proceso</h3>
            <p>Contá cómo llegaste hasta acá: los intentos también son parte de la idea.</p>
          </article>
          <article>
            <MessageSquare size={20} />
            <h3>Dejá una pregunta</h3>
            <p>Invitá a otras miradas a formar parte de la conversación.</p>
          </article>
        </div>
      </div>
    </AnimatedRegion>
  );
}
