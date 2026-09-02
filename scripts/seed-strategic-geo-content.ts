/**
 * One-time bootstrap for the "strategic-geo-explorer-pvt-ltd" organization.
 *
 * Creates the 5 component types this site needs (if they don't already
 * exist) and populates them with the REAL copy already live in that
 * site's repo (data/services.json, projects.json, team.json,
 * testimonials.json, community.json) — so you're not retyping 25 items
 * by hand through the dashboard.
 *
 * What this does NOT do, on purpose:
 * - Does not create the Organization itself (it already exists — this
 *   script looks it up by slug and fails clearly if it's missing).
 * - Does not set any IMAGE field — every image in the source JSON is a
 *   local file path (/images/services/...), not a real
 *   res.cloudinary.com URL, and the CMS's own validation would reject
 *   it anyway (AGENTS.md §5). Images are left null; the console output
 *   at the end lists exactly which ones still need uploading through
 *   the dashboard.
 * - Is safe to re-run: component types are only created if missing
 *   (won't overwrite manual edits), and each content collection is only
 *   seeded once — if instances already exist for a type on this org, it's
 *   skipped rather than duplicated.
 *
 * Run with: npx tsx scripts/seed-strategic-geo-content.ts
 * Requires MONGODB_URI in your environment, pointed at the real database.
 */

import { Types } from "mongoose";
import { connectDB } from "../lib/mongodb";
import { Organization } from "../models/Organization";
import { ComponentType } from "../models/ComponentType";
import { ComponentInstance } from "../models/ComponentInstance";
import type { FieldDefinition } from "../lib/field-types";

const ORG_SLUG = "strategic-geo-explorer-pvt-ltd";

/** Wraps plain paragraph strings into the Tiptap JSON doc shape the CMS expects for RICH_TEXT fields. */
function toRichText(paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Component type definitions                                          */
/* ------------------------------------------------------------------ */

const COMPONENT_TYPES: {
  name: string;
  slug: string;
  description: string;
  fields: FieldDefinition[];
}[] = [
  {
    name: "Service",
    slug: "service",
    description: "One service offering shown on the Services page.",
    fields: [
      { key: "title", label: "Title", type: "TEXT", required: true, order: 0 },
      { key: "slug", label: "URL slug", type: "TEXT", required: true, order: 1 },
      { key: "icon", label: "Icon name", type: "TEXT", required: false, order: 2, helpText: "Matches an icon name in components/Icon.tsx" },
      { key: "shortDescription", label: "Short description", type: "TEXT", required: true, order: 3 },
      { key: "fullDescription", label: "Full description", type: "RICH_TEXT", required: true, order: 4 },
      { key: "featuredImage", label: "Featured image", type: "IMAGE", required: false, order: 5 },
    ],
  },
  {
    name: "Project",
    slug: "project",
    description: "One case study shown on the Projects page.",
    fields: [
      { key: "title", label: "Title", type: "TEXT", required: true, order: 0 },
      { key: "slug", label: "URL slug", type: "TEXT", required: true, order: 1 },
      { key: "category", label: "Category", type: "TEXT", required: true, order: 2 },
      { key: "client", label: "Client", type: "TEXT", required: false, order: 3 },
      { key: "location", label: "Location", type: "TEXT", required: false, order: 4 },
      { key: "year", label: "Year", type: "NUMBER", required: false, order: 5 },
      { key: "excerpt", label: "Excerpt", type: "TEXT", required: true, order: 6 },
      { key: "description", label: "Description", type: "RICH_TEXT", required: true, order: 7 },
      { key: "coverImage", label: "Cover image", type: "IMAGE", required: false, order: 8 },
    ],
  },
  {
    name: "Team Member",
    slug: "team-member",
    description: "One person shown on the About page team section.",
    fields: [
      { key: "name", label: "Name", type: "TEXT", required: true, order: 0 },
      { key: "role", label: "Role", type: "TEXT", required: true, order: 1 },
      { key: "profession", label: "Profession", type: "TEXT", required: false, order: 2 },
      { key: "bio", label: "Bio", type: "TEXT", required: false, order: 3 },
      { key: "photo", label: "Photo", type: "IMAGE", required: false, order: 4 },
    ],
  },
  {
    name: "Testimonial",
    slug: "testimonial",
    description: "One client quote shown on the homepage.",
    fields: [
      { key: "clientName", label: "Client name", type: "TEXT", required: true, order: 0 },
      { key: "quote", label: "Quote", type: "TEXT", required: true, order: 1 },
      { key: "role", label: "Client role / company", type: "TEXT", required: false, order: 2 },
    ],
  },
  {
    name: "Community Initiative",
    slug: "community-initiative",
    description: "One outreach initiative shown on the Community page.",
    fields: [
      { key: "title", label: "Title", type: "TEXT", required: true, order: 0 },
      { key: "description", label: "Description", type: "TEXT", required: true, order: 1 },
      { key: "image", label: "Image", type: "IMAGE", required: false, order: 2 },
      { key: "date", label: "Date", type: "DATE", required: false, order: 3 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Real content, transcribed from the client site's own data/*.json    */
/* ------------------------------------------------------------------ */

const SERVICES = [
  { title: "Environmental Remediation & Modeling", slug: "environmental-engineering", icon: "leaf", shortDescription: "Environmental risk assessment, characterization plans, groundwater flow modeling, and site cleanups.", fullDescription: ["Strategic site characterization plans for brownfield and greenfield environments under national and local regulations.", "Sophisticated numerical modeling of aquifer contaminants to evaluate and mitigate transport vectors.", "Comprehensive drafting of emergency safety projects and custom-engineered remediation workflows."] },
  { title: "Hydraulic & Hydrological Design", slug: "hydraulic-hydrological", icon: "droplet", shortDescription: "Flood risk analysis, hydrological basin evaluations, and stormwater infrastructure design.", fullDescription: ["Rigorous mapping of local hydraulic risks and basin-wide flood hazard zones.", "Dynamic hydrological modeling of complex urban sewer networks and natural river channels.", "Custom development of hydraulic mitigation schemes and climate-resilient water discharge infrastructure."] },
  { title: "Geotechnical & Geognostic Surveys", slug: "geotechnical-surveys", icon: "mountain", shortDescription: "Subsoil testing, slope stability modeling, core drilling, and foundation engineering.", fullDescription: ["Advanced deep geognostic core drilling and soil mechanics laboratory coordination.", "Static and dynamic slope stability analysis with real-time geotechnical instrumentation.", "Expert structural recommendations for deep foundation stabilization and slope retaining systems."] },
  { title: "Environmental Impact Assessment (EIA)", slug: "environmental-impact-assessment", icon: "file-text", shortDescription: "Permit acquisition, regulatory compliance support, noise and atmospheric impact studies.", fullDescription: ["End-to-end EIA reports conforming to the latest national environmental protection directives.", "Specialized atmospheric modeling, acoustic simulation studies, and biodiversity impact indices.", "Technical representation and documentation for cross-departmental regulatory public hearings."] },
  { title: "Renewable Energy Site Feasibility", slug: "renewable-energy-consulting", icon: "zap", shortDescription: "Site selection, environmental constraints verification, and soil-foundation matching for green plants.", fullDescription: ["Preliminary soil and environmental constraint screening for solar farms and wind turbine arrays.", "Geophysical resistivity studies for grounding design and electrical infrastructure routing.", "Comprehensive geohazard assessment maps to minimize long-term capital risk."] },
  { title: "Coastal & Marine Surveys", slug: "coastal-marine-engineering", icon: "waves", shortDescription: "Seabed sediment analyses, marine hydrology, and breakwater or port foundation design.", fullDescription: ["Precision marine geophysics and sub-bottom profiling for near-shore foundations.", "Sediment characterization studies to support environmental dredging and beach nourishment.", "Hydraulic simulation of maritime infrastructure including docks, breakwaters, and seawalls."] },
  { title: "Natural Hazard Mitigation", slug: "hazard-mitigation-disaster-recovery", icon: "shield-alert", shortDescription: "Landslide stabilization, seismic micro-zonation studies, and emergency structural reinforcement.", fullDescription: ["Detailed local seismic hazard assessments and site-specific response spectrum analysis.", "Emergency geological modeling of landslide runout and rapid mitigation design plans.", "Structural soil reinforcement technologies utilizing micropiles and advanced geosynthetics."] },
];

const PROJECTS = [
  { title: "Po River Basin Hydraulic Safety Plan", slug: "po-river-basin-hydraulic-safety", category: "Hydraulic Engineering", client: "Po River Regional Authority", location: "Piedmont & Lombardy, Italy", year: 2023, excerpt: "Comprehensive 2D hydraulic modeling and localized design of bypass channels for high-flow containment.", description: ["A complete hydraulic hazard reassessment was performed for a critical 45km stretch of the Po river basin using advanced HEC-RAS 2D simulation methodologies.", "The project yielded three critical bypass designs, integrated with local ecological green belts, which reduced municipal flood risk index scores by over 45%."] },
  { title: "Industrial Foundry Soil Decontamination", slug: "former-steel-foundry-remediation", category: "Environmental Remediation", client: "Metals & Co. S.p.A.", location: "Genoa, Italy", year: 2022, excerpt: "Comprehensive characterization and in-situ chemical oxidation treatment of heavy metal and PAH contaminants.", description: ["Assessed deep heavy-metal and polycyclic aromatic hydrocarbon (PAH) concentrations across a defunct 12-hectare industrial foundry site.", "Engineered an innovative in-situ chemical oxidation program, safeguarding deep aquifers and facilitating safe commercial reuse zone conversions."] },
  { title: "Apennines A16 Highway Landslide Mitigation", slug: "apennines-highway-slope-stabilization", category: "Geotechnical Surveys", client: "Autostrade d'Italia S.p.A.", location: "Campania, Italy", year: 2021, excerpt: "Stabilization of a 30,000 cubic meter active clay landslide overlooking a high-traffic highway corridor.", description: ["Performed deep core drilling, seismic refraction profiling, and continuous inclinometer installation to understand deep clay slide kinematics.", "Designed and supervised installation of a 120-micropile retaining wall structure coupled with deep subhorizontal drains and geogrid stabilization mats."] },
  { title: "Sicily Hills 60MW Wind Farm Feasibility", slug: "sicily-wind-farm-foundation-assessments", category: "Renewable Energy Consulting", client: "VentoSud Energia", location: "Enna, Sicily", year: 2023, excerpt: "Geological, geophysical and geotechnical investigation for 18 heavy wind turbine tower placements.", description: ["Conducted down-hole seismic investigations and electrical resistivity imaging to map geological fracturing and determine dynamic stiffness properties of soils.", "Optimized structural concrete pad and deep pile foundations to withstand intense seismic load distributions characteristic of the Central Sicilian hills."] },
  { title: "Port of Marghera Environmental Impact Assessment", slug: "marghera-port-dredging-eia", category: "Environmental Impact Assessment", client: "Venice Port Authority", location: "Venice, Italy", year: 2022, excerpt: "Environmental impact study and regulatory support for deep canal dredging and sediment encapsulation.", description: ["Coordinated a multi-seasonal EIA reporting program covering maritime acoustic pollution, hydrodynamics of Lagoon tides, and heavy metal dispersal in suspended sediments.", "Successfully secured ministerial environmental approval for dredging 1.2 million cubic meters of industrial-adjacent canal bed sediments."] },
  { title: "Amalfi Coast Historic Seawall Structural Assessment", slug: "amalfi-cliffs-seawall-restoration", category: "Coastal & Marine Engineering", client: "Municipality of Amalfi", location: "Salerno, Italy", year: 2024, excerpt: "Underwater bathymetric imaging and structural engineering analysis for wave-battered heritage masonry.", description: ["Deployed high-resolution side-scan sonar and ROV-mounted cameras to identify voids and scouring beneath century-old sea walls.", "Engineered an state-of-the-art pressure-grouted micro-concrete reinforcement schedule that preserves the outer aesthetic of the historic coastal road."] },
];

const TEAM = [
  { name: "Dr. Alessandro Rossi", role: "Founder & Managing Director", profession: "Senior Geologist", bio: "Alessandro has over 25 years of geological survey expertise. He directs overall engineering strategy and is the lead expert for seismic micro-zonation studies." },
  { name: "Dr. Beatrice Bianchi", role: "Partner & Technical Director", profession: "Environmental Engineer", bio: "Beatrice oversees the soil remediation and pollutant modeling workflows. She is a recognized speaker on brownfield decontamination strategies." },
  { name: "Ing. Carlo Ferrero", role: "Senior Consultant", profession: "Hydraulics Specialist", bio: "Carlo manages our hydraulic structures and flood risk mapping department. He design river restorations and major city rainwater networks." },
  { name: "Dr. Elena Moretti", role: "Senior Specialist", profession: "Geotechnical Engineer", bio: "Elena has structured dozens of deep foundations and slope stabilizing systems across Southern and Northern Europe. She is expert in geosynthetic materials." },
  { name: "Dr. Francesca Galli", role: "Consultant", profession: "GIS & Remote Sensing Analyst", bio: "Francesca creates spatial risk maps, processes satellite imagery for soil-movement indicators, and builds interactive client project maps." },
  { name: "Ing. Giovanni Russo", role: "Junior Partner", profession: "Renewable Infrastructure Expert", bio: "Giovanni specializes in the mechanical and structural constraints of wind turbine layouts and utility-scale solar mechanical frames." },
  { name: "Laura Ricci", role: "Head of Environmental Permitting", profession: "Regulatory Specialist", bio: "Laura liaises with public administrations to obtain environmental clearances, ensuring full project compliance under regional laws." },
  { name: "Stefano Bruno", role: "Field Operations Lead", profession: "Lead Geognostic Surveyor", bio: "Stefano coordinates on-site drilling, piezometer installations, and sample extractions, ensuring rigorous chains of custody for chemical analysis." },
];

const TESTIMONIALS = [
  { clientName: "Ing. Marco Valenti", quote: "Apex GeoConsulting delivered outstanding precision in their subsoil models. Their expertise kept our heavy rail infrastructure project safe and compliant under challenging geotechnical conditions.", role: "Chief Infrastructure Officer, NordRail Group" },
  { clientName: "Dr. Sylvia Rost", quote: "Their environmental risk simulations and fast-tracked permitting assistance saved us months of development delay. Truly a world-class engineering consultancy.", role: "Director of Environmental Affairs, Helios Energy Corp" },
];

const COMMUNITY = [
  { title: "Community River Health & Hydrology Workshops", description: "We run periodic outreach programs for secondary school classes, providing interactive training on river hydrology, water quality monitoring, and soil run-off calculations.", date: new Date("2024-04-12") },
  { title: "Public Earthquake Risk Seminars", description: "Our senior geologists lead local safety discussions, explaining seismic wave propagation and illustrating optimal home structural reinforcement strategies to citizens.", date: new Date("2023-11-05") },
];

/* ------------------------------------------------------------------ */
/* Seeding logic                                                       */
/* ------------------------------------------------------------------ */

async function upsertComponentType(spec: (typeof COMPONENT_TYPES)[number]) {
  const doc = await ComponentType.findOneAndUpdate(
    { slug: spec.slug },
    {
      $setOnInsert: {
        name: spec.name,
        slug: spec.slug,
        description: spec.description,
        isRepeatable: true,
        fields: spec.fields,
      },
    },
    { upsert: true, new: true }
  );
  return doc;
}

async function seedInstances(
  organizationId: Types.ObjectId,
  componentTypeId: Types.ObjectId,
  page: string,
  items: Record<string, unknown>[]
) {
  const existingCount = await ComponentInstance.countDocuments({
    organization: organizationId,
    componentType: componentTypeId,
    page,
  });

  if (existingCount > 0) {
    console.log(`  Skipping "${page}" — ${existingCount} instance(s) already exist.`);
    return 0;
  }

  const docs = items.map((values, index) => ({
    organization: organizationId,
    componentType: componentTypeId,
    page,
    order: index,
    values: Object.entries(values).map(([key, value]) => ({ key, value })),
    updatedBy: "seed-script",
  }));

  await ComponentInstance.insertMany(docs);
  console.log(`  Created ${docs.length} instance(s) on "${page}".`);
  return docs.length;
}

export async function main() {
  await connectDB();

  const org = await Organization.findOne({ slug: ORG_SLUG });
  if (!org) {
    console.error(
      `No organization found with slug "${ORG_SLUG}". Create it in the dashboard first (Organizations → New), then re-run this script.`
    );
    process.exit(1);
  }
  console.log(`Found organization: ${org.name} (${org._id})`);

  const typesBySlug: Record<string, { _id: Types.ObjectId }> = {};
  for (const spec of COMPONENT_TYPES) {
    const doc = await upsertComponentType(spec);
    typesBySlug[spec.slug] = doc!;
    console.log(`Component type ready: ${spec.slug}`);
  }

  console.log("\nSeeding content...");

  await seedInstances(
    org._id,
    typesBySlug["service"]._id,
    "services",
    SERVICES.map((s) => ({ ...s, fullDescription: toRichText(s.fullDescription), featuredImage: null }))
  );

  await seedInstances(
    org._id,
    typesBySlug["project"]._id,
    "projects",
    PROJECTS.map((p) => ({ ...p, description: toRichText(p.description), coverImage: null }))
  );

  await seedInstances(
    org._id,
    typesBySlug["team-member"]._id,
    "about",
    TEAM.map((t) => ({ ...t, photo: null }))
  );

  await seedInstances(
    org._id,
    typesBySlug["testimonial"]._id,
    "home",
    TESTIMONIALS
  );

  await seedInstances(
    org._id,
    typesBySlug["community-initiative"]._id,
    "community",
    COMMUNITY.map((c) => ({ ...c, image: null }))
  );

  console.log(`
Done. Text content is live. Images still need uploading through the
dashboard's Cloudinary upload (local file paths from the source JSON
can't be used directly — see the note at the top of this file):

  Services (7):      featuredImage for each of the 7 services
  Projects (6):       coverImage for each of the 6 projects
  Team (8):            photo for each of the 8 team members
  Community (2):      image for each of the 2 initiatives

That's 23 images total. Open each instance in the dashboard's page editor
and upload — the text/data fields are already filled in correctly.
`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
