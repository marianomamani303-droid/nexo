import { useSearchParams } from 'react-router-dom';
import { Plus, Users, ArrowUpRight } from 'lucide-react';
import { interests } from '../config/interests';
import { useCommunities } from '../hooks/useSocialData';
import { useNavigate } from 'react-router-dom';
import { CommunityCard } from '../components/CommunityCard';
import { ResourceView } from '../components/ResourceView';
import { EmptyState } from '../components/EmptyState';
import { AnimatedRegion } from '../components/AnimatedRegion';
import { PageHeading } from '../components/PageHeading';
export function Communities() {
  const [params, setParams] = useSearchParams();
  const category = params.get('categoria') || 'Todo';
  const resource = useCommunities('', category === 'Todo' ? '' : category);
  const navigate = useNavigate();
  const notify = () => navigate('/comunidades/nueva');
  return (
    <AnimatedRegion identity="communities">
      <PageHeading
        eyebrow="ENCONTRÁ A TU GENTE"
        title={
          <>
            Las ideas crecen <em>en plural.</em>
          </>
        }
        description="Intereses en común. Perspectivas diferentes. Nuevas posibilidades."
      />
      <section className="community-feature" data-reveal>
        <div>
          <span className="eyebrow">EL VALOR DE PERTENECER</span>
          <h2>
            Un punto de encuentro
            <br />
            para lo que te apasiona.
          </h2>
          <p>Hacé espacio para conversaciones que valgan la pena.</p>
          <button className="button accent" onClick={() => notify()}>
            <Plus size={15} />
            Crear comunidad
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="community-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>
            <Users size={31} strokeWidth={1} />
          </span>
        </div>
      </section>
      <div className="section-title" data-reveal>
        <h2>Explorá tus intereses</h2>
        <span>DESCUBRIR / CONECTAR / CRECER</span>
      </div>
      <div className="chips" data-reveal>
        {interests.map((interest) => (
          <button
            key={interest}
            aria-pressed={category === interest}
            onClick={() => setParams({ categoria: interest })}
          >
            {interest}
          </button>
        ))}
      </div>
      <AnimatedRegion identity={category}>
        <ResourceView
          resource={resource}
          isEmpty={(data) => !data.items.length}
          empty={
            <EmptyState
              icon={Users}
              title="Tu próxima comunidad está por llegar."
              description="Creá una comunidad y reuní a personas que compartan lo que te mueve."
              action={{ label: 'Crear una comunidad', onClick: () => notify() }}
            />
          }
        >
          {(data) => (
            <div className="community-grid">
              {data.items.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          )}
        </ResourceView>
      </AnimatedRegion>
    </AnimatedRegion>
  );
}
