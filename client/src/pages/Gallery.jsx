import Layout from '../components/Layout';
import '../styles/Gallery.css';

const catsData = [
    {
        id: 1,
        name: "Oliver",
        age: "2 years",
        breed: "British Shorthair",
        source: "Shelter", 
        urgency: null,
        personality: "Calm",
        imageUrl: "https://images.unsplash.com/photo-1513245533132-31f507417b26?q=80&w=500"
    },
    {
        id: 2,
        name: "Bella",
        age: "4 months",
        breed: "Mixed",
        source: "Private",
        urgency: "Immediate", 
        personality: "Energetic",
        imageUrl: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?q=80&w=500"
    }
];

const Gallery = () => {
    return (
        <Layout>
        <div className="gallery-page">
            <div className="gallery-intro">
                <h2 className="gallery-title">Browse cats</h2>
                <p className="gallery-subtitle">
                    Filter by source, urgency, and breed — same warm MusyaMatch look as home.
                </p>
            </div>
            <div className="gallery-body">
            <aside className="filters-panel" aria-label="Search filters">
                <h3 className="filters-panel-title">Search Filters</h3>

                <div className="filter-group">
                    <label>Category</label>
                    <select>
                        <option value="all">All Cats</option>
                        <option value="shelter">Shelter Only</option>
                        <option value="private">Private / Foster</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Urgency Level</label>
                    <div className="urgency-filters">
                        <button type="button" className="btn-urgency low">Low</button>
                        <button type="button" className="btn-urgency med">Medium</button>
                        <button type="button" className="btn-urgency imm">Immediate</button>
                    </div>
                </div>

                <div className="filter-group">
                    <label>Breed</label>
                    <input type="text" placeholder="e.g. Maine Coon" />
                </div>
            </aside>

            <main className="gallery-main" aria-label="Cat listings">
                <div className="cat-grid">
                {catsData.map((cat) => (
                    <div className="cat-card" key={cat.id}>
                        <div className="image-wrapper">
                            <img src={cat.imageUrl} alt={cat.name} />
                            <span className={`badge ${cat.source.toLowerCase()}`}>
                {cat.source}
              </span>
                        </div>

                        <div className="cat-info">
                            <div className="card-header">
                                <h3>{cat.name}</h3>
                                <span className="ai-tag">✨ {cat.personality}</span>
                            </div>

                            <p className="specs">{cat.breed} • {cat.age}</p>

                            {cat.source === "Private" && cat.urgency && (
                                <div className={`urgency-banner ${cat.urgency.toLowerCase()}`}>
                                    Urgency: {cat.urgency}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                </div>
            </main>
            </div>
        </div>
        </Layout>
    );
};
export default Gallery;