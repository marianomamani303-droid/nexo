import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Compass, ArrowUpRight, X } from 'lucide-react';
import { interests } from '../config/interests';
import { useFeed, usePeople, useCommunities } from '../hooks/useSocialData';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { PostCard } from '../components/PostCard';
import { CommunityCard } from '../components/CommunityCard';
import { PeopleList } from '../components/PeopleList';
import { PageHeading } from '../components/PageHeading';
import { AnimatedRegion } from '../components/AnimatedRegion';
import { Tabs } from '../components/Tabs';
export function Explore() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [query, setQuery] = useState(q);
  const rawTab = params.get('tab');
  const tab = rawTab === 'personas' || rawTab === 'comunidades' ? rawTab : 'publicaciones';
  const category = params.get('categoria') || 'Todo';
  useEffect(() => setQuery(q), [q]);
  const posts = useFeed({
    kind: 'discover',
    search: q,
    category: category === 'Todo' ? undefined : category,
  });
  const people = usePeople(q);
  const communities = useCommunities(q, category === 'Todo' ? '' : category);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  }
  const empty = (
    <EmptyState
      icon={Search}
      title={q ? 'Hay ideas que todavía no llegaron.' : 'Dale espacio a la curiosidad.'}
      description={
        q
          ? `No encontramos resultados para «${q}». Probá con otro término o categoría.`
          : 'Las publicaciones, personas y comunidades aparecerán acá cuando estén disponibles. Mientras tanto, explorá las distintas categorías.'
      }
      action={q ? { label: 'Limpiar búsqueda', onClick: () => update('q', '') } : undefined}
    />
  );
  return (
    <AnimatedRegion identity="explore">
      <PageHeading
        eyebrow="SEGUÍ TU CURIOSIDAD"
        title={
          <>
            Un mundo por <em>descubrir.</em>
          </>
        }
        description="Las mejores conexiones empiezan con una pregunta."
      />
      <section className="explore-feature" data-reveal>
        <div className="explore-feature-copy">
          <span className="eyebrow">ABRÍ NUEVAS POSIBILIDADES</span>
          <h2>
            Fuera de tu órbita
            <br />
            también hay buenas ideas.
          </h2>
          <p>Encontrá perspectivas que amplíen la tuya.</p>
        </div>
        <div className="explore-mark" aria-hidden="true">
          <Compass size={110} strokeWidth={0.65} />
          <span>SEGUÍ EXPLORANDO ↗</span>
        </div>
      </section>
      <form
        className="page-search"
        role="search"
        data-reveal
        onSubmit={(event) => {
          event.preventDefault();
          update('q', query.trim());
        }}
      >
        <Search size={20} />
        <input
          aria-label="Buscar publicaciones, personas y comunidades"
          placeholder="Una idea, un interés, una nueva perspectiva…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="icon-button"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setQuery('');
              update('q', '');
            }}
          >
            <X size={15} />
          </button>
        )}
        <button className="button primary">
          Buscar
          <ArrowUpRight size={14} />
        </button>
      </form>
      <div data-reveal>
        <Tabs
          label="Tipo de resultados"
          value={tab}
          onChange={(value) => update('tab', value)}
          options={[
            { value: 'publicaciones', label: 'Publicaciones' },
            { value: 'personas', label: 'Personas' },
            { value: 'comunidades', label: 'Comunidades' },
          ]}
        />
      </div>
      {tab !== 'personas' && (
        <div className="chips" data-reveal>
          {interests.map((interest) => (
            <button
              key={interest}
              aria-pressed={category === interest}
              onClick={() => update('categoria', interest)}
            >
              {interest}
            </button>
          ))}
        </div>
      )}
      <AnimatedRegion identity={tab + q + category} className="results-region">
        {tab === 'publicaciones' && (
          <ResourceView resource={posts} empty={empty} isEmpty={(data) => !data.items.length}>
            {(data) => (
              <div className="post-list">
                {data.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </ResourceView>
        )}
        {tab === 'personas' && (
          <ResourceView resource={people} empty={empty} isEmpty={(data) => !data.items.length}>
            {(data) => <PeopleList users={data.items} />}
          </ResourceView>
        )}
        {tab === 'comunidades' && (
          <ResourceView resource={communities} empty={empty} isEmpty={(data) => !data.items.length}>
            {(data) => (
              <div className="community-grid">
                {data.items.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
            )}
          </ResourceView>
        )}
      </AnimatedRegion>
    </AnimatedRegion>
  );
}
