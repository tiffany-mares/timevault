import { PageLayout } from "@/components/PageLayout";
import { WireBox } from "@/components/wireframe";
import { SectionNav } from "@/components/SectionNav";
import { Layers, Monitor, Server, Database, Brain, Shield, ScrollText, Cloud, Cpu } from "lucide-react";
import archDiagram from "@/assets/architecture-diagram.png";

const Mono = ({ children }: { children: React.ReactNode }) => (
    <span className="font-mono text-foreground">{children}</span>
);

// ---- Tech stack data ----
const techGroups = [
    { title: "Frontend", items: ["React 18", "TypeScript", "Vite", "Tailwind CSS", "React Router", "Recharts", "Lucide"] },
    { title: "Backend", items: ["Python", "Flask", "gunicorn", "psycopg2", "PyJWT", "Werkzeug"] },
    { title: "Machine Learning", items: ["scikit-learn", "pandas", "NumPy"] },
    { title: "Data", items: ["PostgreSQL"] },
    { title: "Infrastructure", items: ["Render, Static Site", "Render, Web Service", "Managed PostgreSQL"] },
];

const HowItWorks = () => {
    return (
        <PageLayout
            code="P-TS"
            title="Tech Stack"
            subtitle="A technical look at how TimeVault is built, the technologies, architecture, and data flow from the browser to the database."
            maxWidth="max-w-4xl"
            marqueeItems={["Tech Stack", "React + Vite", "Flask API", "PostgreSQL", "scikit-learn", "JWT Auth", "Render"]}
        >
            <SectionNav sections={[
                { id: "hiw-techstack", label: "Tech Stack" },
                { id: "hiw-architecture", label: "Architecture" },
                { id: "hiw-frontend", label: "Frontend" },
                { id: "hiw-backend", label: "Backend & API" },
                { id: "hiw-database", label: "Database" },
                { id: "hiw-ml", label: "Machine Learning" },
                { id: "hiw-auth", label: "Auth & Security" },
                { id: "hiw-logging", label: "Request Logging" },
                { id: "hiw-deployment", label: "Deployment" },
            ]} />

            <div id="hiw-techstack" className="scroll-mt-4">
                <WireBox dashed={false} label="TECH STACK" accent="olive">
                    <div className="space-y-4 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Cpu className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>TimeVault is built from these technologies, grouped by layer:</p>
                        </div>
                        {techGroups.map((g) => (
                            <div key={g.title} className="flex flex-col sm:flex-row sm:items-start gap-2">
                                <p className="text-[10px] font-body font-semibold uppercase tracking-widest text-olive sm:w-36 sm:pt-1.5 shrink-0">{g.title}</p>
                                <div className="flex flex-wrap gap-2">
                                    {g.items.map((item) => (
                                        <span key={item} className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-mono text-foreground">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </WireBox>
            </div>

            <div id="hiw-architecture" className="scroll-mt-4">
                <WireBox dashed={false} label="ARCHITECTURE OVERVIEW" accent="olive">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Layers className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>TimeVault is a <span className="text-foreground font-medium">three-tier web application</span>: a React single-page app in the browser, a Python (Flask) REST API, and a PostgreSQL database, deployed as separate services that communicate over HTTP and SQL.</p>
                        </div>

                        {/* Software architecture diagram */}
                        <figure className="my-2">
                            <img
                                src={archDiagram}
                                alt="TimeVault software architecture diagram: browser to React SPA to Flask API to PostgreSQL, with the ML subsystem, request-logging hook, and Render deployment boundary."
                                className="w-full h-auto rounded-md border border-border bg-card"
                                loading="lazy"
                            />
                            <figcaption className="mt-2 text-[11px] font-body text-muted-foreground/70 text-center">
                                Runtime architecture and request flow (C4 container level).
                            </figcaption>
                        </figure>

                        <p>A request flows in one direction: the browser calls the API using relative <Mono>/api/…</Mono> paths; the API authenticates, runs the query or ML model, reads or writes PostgreSQL, and returns JSON; the UI turns that JSON into charts and tables. Because the frontend only uses relative paths, it stays same-origin with the backend, Vite proxies <Mono>/api</Mono> to <Mono>localhost:5001</Mono> in dev, and a static-site rewrite proxies it in production, so there's no CORS handshake.</p>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-frontend" className="scroll-mt-4">
                <WireBox dashed={false} label="FRONTEND">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Monitor className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>The interface is a <span className="text-foreground font-medium">React 18 + TypeScript</span> single-page app bundled by <span className="text-foreground font-medium">Vite</span>. It builds to a folder of static files (<Mono>dist/</Mono>), plain HTML, CSS and JavaScript that any static host can serve.</p>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-2">
                            <li><span className="text-foreground">Routing</span> is client-side via React Router; there is no full page reload when moving between modules.</li>
                            <li><span className="text-foreground">Styling</span> uses Tailwind CSS with a custom archival theme and light/night modes driven by CSS variables.</li>
                            <li><span className="text-foreground">Charts</span> are rendered with Recharts; exports use html2canvas and jsPDF for PNG/PDF output.</li>
                            <li><span className="text-foreground">Data fetching</span> uses the browser <Mono>fetch</Mono> API against relative <Mono>/api</Mono> endpoints, sending the auth token in an <Mono>Authorization: Bearer</Mono> header when signed in.</li>
                            <li><span className="text-foreground">Session state</span> lives in <Mono>localStorage</Mono> (a JWT plus the cached user); it's verified against the backend on load.</li>
                        </ul>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-backend" className="scroll-mt-4">
                <WireBox dashed={false} label="BACKEND & API">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Server className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>The backend is a <span className="text-foreground font-medium">Flask</span> REST API. In local development it runs Flask's built-in server on port <Mono>5001</Mono>; in production it runs under <span className="text-foreground font-medium">gunicorn</span>, a production WSGI server.</p>
                        </div>
                        <p>Every endpoint returns JSON. The main groups are:</p>
                        <ul className="list-disc list-inside space-y-1.5 pl-2">
                            <li><Mono>/api/auth/*</Mono>, register, login, admin login, and token verification.</li>
                            <li><Mono>/api/trends</Mono> and <Mono>/api/compare</Mono>, aggregate queries for the Offence Trends and Compare modules.</li>
                            <li><Mono>/api/run-decision-tree</Mono>, <Mono>/api/run-logistic-regression</Mono>, <Mono>/api/run-naive-bayes</Mono>, train and return a model on request.</li>
                            <li><Mono>/api/reports</Mono>, save, list, and delete a signed-in user's reports.</li>
                            <li><Mono>/api/admin/*</Mono>, admin-only database health and request-log endpoints.</li>
                        </ul>
                        <p>The API talks to PostgreSQL with <span className="text-foreground font-medium">psycopg2</span> using parameterized (<Mono>%s</Mono>) queries to prevent SQL injection. Connection settings are read from the process environment (<Mono>DB_HOST</Mono>, <Mono>DB_NAME</Mono>, <Mono>DB_USER</Mono>, <Mono>DB_PASSWORD</Mono>, <Mono>DB_PORT</Mono>), so the same code runs locally and in the cloud without edits.</p>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-database" className="scroll-mt-4">
                <WireBox dashed={false} label="DATABASE" accent="teal">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Database className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                            <p>All records live in a <span className="text-foreground font-medium">PostgreSQL</span> database seeded from the digitized CEF archival data (roughly 57,000 enlistment records and 11,000 courts martial records).</p>
                        </div>
                        <p>The core tables:</p>
                        <ul className="list-disc list-inside space-y-1.5 pl-2">
                            <li><Mono>ww1_enlistment</Mono>, soldier demographics and service details.</li>
                            <li><Mono>ww1_court_martial</Mono>, courts martial proceedings and offence records.</li>
                            <li><Mono>joined_courtmartialled_soldiers</Mono>, enlistment records matched to courts martial (used to label soldiers for the ML models).</li>
                            <li><Mono>app_user</Mono>, accounts and roles; <Mono>user_reports</Mono>, saved reports (foreign key to <Mono>app_user</Mono>).</li>
                            <li><Mono>api_request_log</Mono>, the automatic request audit trail.</li>
                        </ul>
                        <p>Indexes on regiment number, surname, and offence keep the common trend and comparison queries fast.</p>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-ml" className="scroll-mt-4">
                <WireBox dashed={false} label="MACHINE LEARNING">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Brain className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>The three models are built with <span className="text-foreground font-medium">scikit-learn</span>, trained <span className="text-foreground font-medium">on demand</span> from live data each time you run an analysis (not precomputed), using the features you select. Pandas and NumPy handle the data preparation.</p>
                        </div>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><span className="text-foreground font-medium">Decision Tree</span>, labels each enlistment record as court-martialled or not (via the joined table), one-hot-encodes nominal features and ordinal-encodes rank, then trains a <Mono>DecisionTreeClassifier</Mono> with <Mono>class_weight="balanced"</Mono> to handle the rare positive class. It returns a readable tree of rules with court-martial rates at each leaf.</li>
                            <li><span className="text-foreground font-medium">Logistic Regression</span>, fits a regression on the same labels and returns a coefficient per feature value, ranking how much each pushes court-martial likelihood up or down (shown as a diverging bar chart).</li>
                            <li><span className="text-foreground font-medium">Naive Bayes</span>, a pattern-discovery tool (not a predictor) that reads a bundled courts-martial CSV and uses conditional probabilities and lift to surface which demographics are over- or under-represented within each offence category.</li>
                        </ul>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-auth" className="scroll-mt-4">
                <WireBox dashed={false} label="AUTHENTICATION & SECURITY">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>Authentication uses <span className="text-foreground font-medium">JSON Web Tokens</span> (JWT, HS256, 24-hour expiry). Passwords are hashed with Werkzeug's <Mono>generate_password_hash</Mono> before storage, plaintext passwords are never kept.</p>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-2">
                            <li>On login the server issues a signed token carrying the user id, username, and role; the browser stores it and sends it on later requests.</li>
                            <li>Admin-only endpoints return <Mono>401</Mono> without a token and <Mono>403</Mono> for a non-admin token; the frontend also guards every <Mono>/admin-*</Mono> route and redirects non-admins to the admin login.</li>
                            <li>The signing secret is supplied by the environment in production, so tokens stay valid across restarts.</li>
                        </ul>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-logging" className="scroll-mt-4">
                <WireBox dashed={false} label="REQUEST LOGGING">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <ScrollText className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                            <p>A Flask <Mono>after_request</Mono> hook records every API call to the <Mono>api_request_log</Mono> table, method, path, status code, duration, and the username when authenticated.</p>
                        </div>
                        <p>The hook skips CORS preflight requests and the admin endpoints themselves (so viewing the logs doesn't create noise), and it's wrapped so a logging failure can never break an actual API response. Admins can browse this live audit trail on the System Logs page.</p>
                    </div>
                </WireBox>
            </div>

            <div id="hiw-deployment" className="scroll-mt-4">
                <WireBox dashed={false} label="DEPLOYMENT" accent="teal">
                    <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                        <div className="flex items-start gap-3">
                            <Cloud className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" />
                            <p>The app is hosted on <span className="text-foreground font-medium">Render</span> as three services described declaratively in a <Mono>render.yaml</Mono> blueprint.</p>
                        </div>
                        <ul className="list-disc list-inside space-y-1.5 pl-2">
                            <li>A <span className="text-foreground">static site</span> serves the built frontend and rewrites <Mono>/api/*</Mono> to the backend.</li>
                            <li>A <span className="text-foreground">web service</span> runs the Flask API under gunicorn.</li>
                            <li>A <span className="text-foreground">managed PostgreSQL</span> instance holds the data; its credentials are injected into the backend as environment variables.</li>
                        </ul>
                        <p>Pushing to the main branch triggers an automatic rebuild and redeploy of both the frontend and backend.</p>
                    </div>
                </WireBox>
            </div>
        </PageLayout>
    );
};

export default HowItWorks;
