import { useState } from 'react';
import { ArrowUpRight, ArrowDown, SlidersHorizontal, Sparkles, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Composer } from '../components/Composer';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { ResourceView } from '../components/ResourceView';
import { Tabs } from '../components/Tabs';
import { OrbitArt } from '../components/OrbitArt';
import { AnimatedRegion } from '../components/AnimatedRegion';
import { useFeed } from '../hooks/useSocialData';
import { useDepth } from '../animations/useMotion';
import { interests } from '../config/interests';
export function Feed() {
  const [tab, setTab] = useState('discover');
  const [filters, setFilters] = useState(false);
  const [category, setCategory] = useState('Todo');
  const resource = useFeed({
    kind: tab === 'following' ? 'following' : 'discover',
    category: category === 'Todo' ? undefined : category,
  });
  const hero = useDepth<HTMLElement>();
  return (
    <AnimatedRegion identity="feed">
      <div className="feed-kicker" data-reveal>
        <span className="eyebrow">
          <span className="tiny-dot" />
          TU ESPACIO, TUS CONEXIONES
        </span>
        <span>NEXO / INICIO</span>
      </div>
      <section className="feed-hero" ref={hero} data-reveal>
        <div className="hero-copy">
          <div className="hero-overline">
            <span />
            IDEAS EN ESTADO LIBRE
          </div>
          <h1>
            Tu voz.
            <br />
            Tu gente.
            <br />
            <em>Sin molde.</em>
          </h1>
          <p>
            Un espacio para compartir lo que sabés,
            <br />
            descubrir lo que te mueve y conectar.
          </p>
          <Link className="hero-link" to="/explorar" data-hover>
            Seguí tu curiosidad
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="hero-art">
          <OrbitArt />
        </div>
        <span className="hero-corner" aria-hidden="true">
          N° 01 — UN NUEVO COMIENZO
        </span>
      </section>
      <div className="feed-intro" data-reveal>
        <div>
          <span className="tiny-square" />
          <h2>Una idea puede cambiar tu día.</h2>
        </div>
        <ArrowDown size={15} />
      </div>
      <div data-reveal>
        <Composer />
      </div>
      <div className="feed-toolbar" data-reveal>
        <Tabs
          label="Seleccionar feed"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'discover', label: 'Para vos' },
            { value: 'following', label: 'Siguiendo' },
          ]}
        />
        <button
          className={`filter-button ${filters ? 'is-active' : ''}`}
          aria-label="Filtrar publicaciones"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={15} />
          <span>Filtrar</span>
        </button>
      </div>
      {filters && (
        <div className="chips" aria-label="Categorías de publicaciones">
          {interests.map((interest) => (
            <button
              key={interest}
              aria-pressed={category === interest}
              onClick={() => setCategory(interest)}
            >
              {interest}
            </button>
          ))}
        </div>
      )}
      <AnimatedRegion identity={tab + category}>
        <ResourceView
          resource={resource}
          isEmpty={(data) => !data.items.length}
          empty={
            <EmptyState
              icon={tab === 'following' ? Sparkles : PenLine}
              variant="feed"
              title={
                tab === 'following'
                  ? 'Las conexiones empiezan acá.'
                  : 'Todavía no hay publicaciones.'
              }
              description={
                tab === 'following'
                  ? 'Las ideas de las personas que sigas aparecerán en este espacio. Seguí nuevas personas para sumar sus perspectivas.'
                  : 'Este espacio está listo para recibir ideas, proyectos y conversaciones. La primera página todavía está por escribirse.'
              }
              action={{ label: 'Publicá tu primera idea', to: '/crear' }}
            />
          }
        >
          {(data) => (
            <div className="post-list">
              {data.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </ResourceView>
      </AnimatedRegion>
      <div className="feed-footnote" data-scroll>
        <span>✳</span>Menos ruido. Más espacio para lo que importa.
        <span className="footnote-line" />
      </div>
    </AnimatedRegion>
  );
}
