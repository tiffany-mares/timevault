import { Calendar, MapPin, AlertTriangle, Shield, FileText, Users, Database, HardDrive, BookOpen } from "lucide-react";
import { WireBox, WireButton } from "@/components/wireframe";
import { PageLayout } from "@/components/PageLayout";
import { AdminHeader } from "@/components/AdminHeader";
import { SectionNav } from "@/components/SectionNav";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { HelpFloatMenu } from "@/components/HelpFloatMenu";

const Metadata = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdmin = location.pathname === "/admin-metadata";

    if (isAdmin) {
      const tables = [
        {
          name: "ww1_enlistment",
          desc: "Soldier demographics and service details from CEF personnel files",
          records: "~57,000",
          columns: [
            { col: "FName", type: "VARCHAR(22)", note: "First name" },
            { col: "Minit", type: "CHAR(1)", note: "Middle initial" },
            { col: "LName", type: "VARCHAR(27)", note: "Last name" },
            { col: "Regiment_number", type: "BIGINT", note: "Regiment number" },
            { col: "Rank", type: "VARCHAR(23)", note: "Rank at enlistment" },
            { col: "Enlistment_Year", type: "INT", note: "Year enlisted" },
            { col: "Year_of_Birth", type: "INT", note: "Birth year" },
            { col: "Place_of_Birth", type: "VARCHAR(32)", note: "Birthplace" },
            { col: "Occupation", type: "VARCHAR(32)", note: "Civilian occupation" },
            { col: "Marital_Status", type: "VARCHAR(12)", note: "Marital status" },
          ],
        },
        {
          name: "ww1_court_martial",
          desc: "Courts martial proceedings and offence records",
          records: "~11,000",
          columns: [
            { col: "FName", type: "VARCHAR(22)", note: "First name" },
            { col: "Minit", type: "CHAR(1)", note: "Middle initial" },
            { col: "LName", type: "VARCHAR(27)", note: "Last name" },
            { col: "Regiment_number", type: "BIGINT", note: "Regiment number" },
            { col: "Rank", type: "VARCHAR(23)", note: "Rank" },
            { col: "Unit_Type", type: "VARCHAR(38)", note: "Military unit type" },
            { col: "Enlistment_Year", type: "INT", note: "Year enlisted" },
            { col: "Offence", type: "VARCHAR(55)", note: "Offence description" },
          ],
        },
        {
          name: "app_user",
          desc: "Registered user accounts for authentication",
          records: "-",
          columns: [
            { col: "id", type: "SERIAL PK", note: "Auto-increment ID" },
            { col: "username", type: "TEXT UNIQUE", note: "Login username" },
            { col: "password_hash", type: "TEXT", note: "Bcrypt hash" },
            { col: "role", type: "TEXT", note: "'admin' or 'viewer'" },
          ],
        },
      ];

      return (
        <PageLayout code="P-22" title="System Metadata" subtitle="Database schema, table structure, and column details" showBackToMenu={true} backButtonPath="/admin-dashboard" backButtonLabel="Back to Admin Dashboard" maxWidth="max-w-4xl" headerOverride={<AdminHeader />} marqueeItems={["System Metadata", "Schema", "Tables", "Columns", "Data Types", "Indexes"]}>

            <div className="grid grid-cols-3 gap-4">
              <WireBox dashed={false} className="p-4 text-center">
                <Database className="w-5 h-5 text-olive mx-auto mb-2" />
                <p className="font-mono text-lg font-bold">3</p>
                <p className="text-xs text-muted-foreground font-body">Primary Tables</p>
              </WireBox>
              <WireBox dashed={false} className="p-4 text-center">
                <HardDrive className="w-5 h-5 text-olive mx-auto mb-2" />
                <p className="font-mono text-lg font-bold">~68k</p>
                <p className="text-xs text-muted-foreground font-body">Total Records</p>
              </WireBox>
              <WireBox dashed={false} className="p-4 text-center">
                <Database className="w-5 h-5 text-olive mx-auto mb-2" />
                <p className="font-mono text-lg font-bold">ww1_db</p>
                <p className="text-xs text-muted-foreground font-body">Database Name</p>
              </WireBox>
            </div>

            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              The PostgreSQL database stores CEF enlistment records, WWI courts martial records, and application user accounts. Data is loaded from cleaned CSV files via the setup script. A derived table (<span className="font-mono text-foreground">joined_courtmartialled_soldiers</span>) is created at setup time by joining enlistment and court martial records.
            </p>

            {tables.map((t) => (
              <WireBox key={t.name} dashed={false} label={t.name.toUpperCase()} accent="olive">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-body">{t.desc}</p>
                  <span className="text-xs font-mono text-muted-foreground">{t.records} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Column</th>
                        <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Type</th>
                        <th className="text-left py-2 px-3 font-body font-semibold uppercase tracking-wide text-olive">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.columns.map((c, i) => (
                        <tr key={c.col} className={`border-b border-border/40 ${i % 2 === 0 ? "bg-card" : "bg-parchment-dark/20"}`}>
                          <td className="py-2 px-3 font-mono font-semibold text-foreground">{c.col}</td>
                          <td className="py-2 px-3 font-mono text-muted-foreground">{c.type}</td>
                          <td className="py-2 px-3 font-body text-muted-foreground">{c.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </WireBox>
            ))}

            <WireBox dashed={false} label="INDEXES" accent="teal">
              <p className="text-xs text-muted-foreground font-body mb-3">Database indexes created for common query patterns.</p>
              <div className="space-y-1.5">
                {[
                  { idx: "idx_regiment", on: "ww1_enlistment(Regiment_number)" },
                  { idx: "idx_lname1", on: "ww1_enlistment(LName)" },
                  { idx: "idx_lname2", on: "ww1_court_martial(LName)" },
                  { idx: "idx_offence", on: "ww1_court_martial(Offence)" },
                ].map((ix) => (
                  <div key={ix.idx} className="flex items-center gap-3 text-xs font-mono py-1.5 border-b border-border/30 last:border-b-0">
                    <span className="text-foreground font-semibold w-28">{ix.idx}</span>
                    <span className="text-muted-foreground">{ix.on}</span>
                  </div>
                ))}
              </div>
            </WireBox>
        </PageLayout>
      );
    }

    return (
        <PageLayout code="P-11" title="Dataset Information" subtitle="Sources, temporal and geographic coverage, known limitations, and ethical considerations" maxWidth="max-w-4xl" marqueeItems={["Dataset Information", "Data Sources", "Temporal Coverage", "Geographic Coverage", "Limitations", "Statistics Canada"]}>
            <SectionNav sections={[
                { id: "di-overview", label: "Overview" },
                { id: "di-sources", label: "Data Sources" },
                { id: "di-temporal", label: "Temporal Coverage" },
                { id: "di-geographic", label: "Geographic Coverage" },
                { id: "di-limitations", label: "Limitations" },
                { id: "di-ethics", label: "Ethical Use" },
            ]} />

            <Link
                to="/user-manual#um-dataset"
              className="inline-flex items-center gap-1.5 text-xs font-body text-olive hover:text-olive-light hover:bg-olive/10 transition-all duration-200 underline underline-offset-2 rounded-sm px-1 -mx-1 py-0.5"
            >
                <BookOpen className="w-3.5 h-3.5" />
              View in User Manual
            </Link>

            <div id="di-overview" className="scroll-mt-4">
            <WireBox dashed={false} label="OVERVIEW">
              <div className="space-y-3 text-sm font-body text-muted-foreground leading-relaxed">
                <p>This page describes the historical datasets used in the TimeVault system. It explains the sources of the data, the time period covered, geographic scope, and known limitations.</p>
                <p>The goal of this system is to help users explore patterns in Canadian Expeditionary Force (CEF) service records and WWI courts martial records using aggregated data.</p>
                <p>All analysis is conducted at the group level, meaning the system focuses on patterns across units, ranks, or other categories rather than individual soldiers.</p>
              </div>
            </WireBox>
            </div>

            <div id="di-sources" className="scroll-mt-4">
            <WireBox dashed={false} label="DATA SOURCES">
              <p className="text-sm font-body text-muted-foreground mb-4">The system combines information from two main historical datasets.</p>

              <div className="space-y-6">
                <div className="border border-border rounded-sm p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-serif font-semibold text-sm">CEF Service Metadata</p>
                      <p className="text-xs text-muted-foreground font-body">Canadian Expeditionary Force Personnel Files</p>
                      
                    </div>
                  </div>
                  <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed">
                    <p>These records contain information about soldiers who served in the Canadian Expeditionary Force during the First World War.</p>
                    <p>Typical information extracted from these files includes:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                      <li>Enlistment year and enlistment location</li>
                      <li>Rank at time of service</li>
                      <li>Place of birth</li>
                      <li>Occupation before enlistment</li>
                      <li>Marital status</li>
                      <li>Unit assignment</li>
                    </ul>
                    <p>These records provide important background information about the soldiers who served during the war.</p>
                    <p>In this system, these attributes are used to study how demographic and service characteristics relate to disciplinary records.</p>
                  </div>
                </div>

                <div className="border border-border rounded-sm p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-serif font-semibold text-sm">Courts Martial Records</p>
                      <p className="text-xs text-muted-foreground font-body">WWI Courts Martial Records</p>
                      <p className="text-xs text-muted-foreground font-body italic">Statistics Canada</p>
                    </div>
                  </div>
                  <div className="text-sm font-body text-muted-foreground space-y-2 leading-relaxed">
                    <p>These records document military disciplinary proceedings conducted during the war.</p>
                    <p>Courts martial were used to address violations of military regulations and maintain discipline within the armed forces.</p>
                    <p>Typical information contained in these records includes:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                      <li>Offence type</li>
                      <li>Date of disciplinary proceeding</li>
                      <li>Rank of the accused soldier</li>
                      <li>Military unit involved</li>
                      <li>Location of the proceeding</li>
                    </ul>
                    <p>In this system, courts martial records are used to analyze patterns in disciplinary actions during the war.</p>
                  </div>
                </div>
              </div>
            </WireBox>
            </div>

            <div id="di-temporal" className="scroll-mt-4">
            <WireBox dashed={false} label="TEMPORAL COVERAGE">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                <p className="text-sm font-body text-muted-foreground">The datasets focus on the period of the First World War (1914-1918). For analysis purposes, the system divides the war into three phases:</p>
              </div>
              <div className="space-y-4">
                {[
                    {
                        phase: "Early War (1914-1915)",
                        lines: [
                            "The early phase of the war saw the rapid mobilization of Canadian forces and the deployment of the first CEF units to Europe.",
                            "Disciplinary records from this period reflect the initial adjustment to wartime conditions.",
                        ],
                    },
                    {
                        phase: "Mid War (1916-1917)",
                        lines: [
                            "This period includes major battles such as the Somme and Vimy Ridge.",
                            "The size of the Canadian Expeditionary Force increased significantly during this phase, which may influence patterns in disciplinary activity.",
                        ],
                    },
                    {
                        phase: "Late War (1918)",
                        lines: [
                            "The final year of the war includes the Allied offensives that eventually led to the end of the conflict.",
                            "Disciplinary patterns during this phase may differ due to changing military conditions and operational pressures.",
                        ],
                    },
                ].map((p) => (
                    <div key={p.phase} className="border-l-2 border-olive/30 pl-4 space-y-1">
                      <p className="font-serif font-semibold text-sm">{p.phase}</p>
                      {p.lines.map((l, i) => (
                        <p key={i} className="text-xs text-muted-foreground font-body leading-relaxed">{l}</p>
                      ))}
                    </div>
                ))}
              </div>
            </WireBox>
            </div>

            <div id="di-geographic" className="scroll-mt-4">
            <WireBox dashed={false} label="GEOGRAPHIC COVERAGE">
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                <p className="text-sm font-body text-muted-foreground">The records in this system include data from several geographic contexts associated with Canadian military service.</p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    area: "Western Front (Primary Coverage)",
                    desc: "Most courts martial records relate to Canadian units serving on the Western Front in France and Belgium, where the majority of Canadian forces were deployed.",
                  },
                  {
                    area: "Home Front Canada (Partial Coverage)",
                    desc: "Some records relate to disciplinary actions occurring within Canada during training, recruitment, or administrative service. Coverage for these records is partial.",
                  },
                  {
                    area: "Other Theatres (Limited Coverage)",
                    desc: "A smaller number of records may relate to other operational areas where Canadian forces served. However, these records are less common and are not the primary focus of the dataset.",
                  },
                ].map((g) => (
                  <div key={g.area} className="border-l-2 border-olive/30 pl-4 space-y-1">
                    <p className="font-serif font-semibold text-sm">{g.area}</p>
                    <p className="text-xs text-muted-foreground font-body leading-relaxed">{g.desc}</p>
                  </div>
                ))}
              </div>
            </WireBox>
            </div>

            <div id="di-limitations" className="scroll-mt-4">
            <WireBox dashed={false} className="border-rust/30 bg-rust/5" label="KNOWN LIMITATIONS">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-rust mt-0.5 flex-shrink-0" />
                <p className="text-sm font-body text-muted-foreground">Historical archival datasets often contain gaps or inconsistencies. Users should consider the following limitations when interpreting results.</p>
              </div>
              <div className="space-y-4">
                {[
                    {
                        title: "Incomplete Records",
                        desc: "Some Canadian military records may be incomplete due to archival loss, missing documents, or gaps in the surviving records. As a result, the dataset may not represent all disciplinary events that occurred during the war.",
                    },
                    {
                        title: "Variation in Offence Definitions",
                        desc: "Offence categories may vary across different types of historical records. Similar disciplinary actions might be recorded under different offence descriptions depending on the context or administrative practices of the time.",
                    },
                    {
                        title: "Digitisation and Transcription Uncertainty",
                        desc: "Many archival records have been digitized from handwritten documents. This process can introduce transcription uncertainty, particularly when interpreting historical handwriting.",
                    },
                    {
                        title: "Historical Context",
                        desc: "Courts martial records reflect formal disciplinary proceedings, not all forms of misconduct or disciplinary action. Therefore, the dataset represents recorded military discipline, rather than the full range of soldier experiences during the war.",
                    },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rust mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-serif font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </WireBox>
            </div>

            <div id="di-ethics" className="scroll-mt-4">
            <WireBox dashed={false} label="ETHICAL USE OF HISTORICAL DATA" accent="olive">
              <div className="flex items-start gap-3 mb-3">
                <Shield className="w-5 h-5 text-olive mt-0.5 flex-shrink-0" />
                <p className="text-sm font-body text-muted-foreground">This system is designed to support historical research and education. To ensure responsible interpretation:</p>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground font-body pl-8">
                <li className="flex items-start gap-2">
                  <span className="text-olive font-bold mt-px">•</span>
                  <span>All analysis is conducted using aggregated data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-olive font-bold mt-px">•</span>
                  <span>Individual soldiers are not identified or evaluated</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-olive font-bold mt-px">•</span>
                  <span>Results should be interpreted within the broader historical context of wartime military discipline</span>
                </li>
              </ul>
            </WireBox>
            </div>
          <HelpFloatMenu manualSectionId="um-dataset" />
        </PageLayout>
    );
};

export default Metadata;
