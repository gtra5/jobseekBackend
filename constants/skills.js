/**
 * Skills Taxonomy
 * Single source of truth for all skills served via GET /api/skills.
 * The frontend fetches this list at runtime — never hardcode it there.
 *
 * Structure: { category: string, skills: string[] }[]
 * The flat list is also exported for validation use (e.g. on job/profile writes).
 */

const SKILLS_BY_CATEGORY = [
  {
    category: 'Programming Languages',
    skills: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go',
      'Rust', 'Swift', 'Kotlin', 'PHP', 'Ruby', 'Scala', 'R', 'Dart', 'Lua',
      'Perl', 'Bash', 'PowerShell', 'MATLAB', 'Groovy', 'Elixir', 'Haskell',
      'Clojure', 'F#', 'Julia', 'Objective-C', 'Assembly',
    ],
  },
  {
    category: 'Web Frontend',
    skills: [
      'React', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'SvelteKit',
      'HTML', 'CSS', 'Tailwind CSS', 'SASS/SCSS', 'Bootstrap', 'Material UI',
      'Chakra UI', 'shadcn/ui', 'Framer Motion', 'GSAP', 'Webpack', 'Vite',
      'Parcel', 'Redux', 'Zustand', 'Recoil', 'MobX', 'GraphQL', 'REST APIs',
      'WebSockets', 'PWA', 'Web Accessibility (WCAG)', 'Responsive Design',
    ],
  },
  {
    category: 'Web Backend',
    skills: [
      'Node.js', 'Express.js', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI',
      'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET', 'Phoenix', 'Gin',
      'Fiber', 'Hapi.js', 'Koa.js', 'gRPC', 'REST API Design', 'GraphQL API',
      'Microservices', 'Serverless', 'WebSockets', 'Message Queues',
    ],
  },
  {
    category: 'Databases',
    skills: [
      'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch',
      'Cassandra', 'DynamoDB', 'Firebase Firestore', 'Supabase', 'PlanetScale',
      'Oracle DB', 'MS SQL Server', 'CouchDB', 'InfluxDB', 'Neo4j', 'Prisma',
      'Mongoose', 'TypeORM', 'Sequelize', 'SQLAlchemy',
    ],
  },
  {
    category: 'Cloud & DevOps',
    skills: [
      'AWS', 'Google Cloud (GCP)', 'Microsoft Azure', 'Docker', 'Kubernetes',
      'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD',
      'CircleCI', 'Heroku', 'Vercel', 'Netlify', 'Nginx', 'Linux/Unix',
      'Prometheus', 'Grafana', 'Datadog', 'New Relic', 'ELK Stack',
      'CloudFormation', 'Pulumi',
    ],
  },
  {
    category: 'Mobile',
    skills: [
      'React Native', 'Flutter', 'iOS Development', 'Android Development',
      'SwiftUI', 'Jetpack Compose', 'Expo', 'Ionic', 'Xamarin', 'Cordova',
    ],
  },
  {
    category: 'AI & Data',
    skills: [
      'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
      'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy',
      'Data Analysis', 'Data Visualization', 'SQL', 'Spark', 'Hadoop',
      'Tableau', 'Power BI', 'Looker', 'dbt', 'Airflow', 'MLflow',
      'OpenAI API', 'LangChain', 'Prompt Engineering',
    ],
  },
  {
    category: 'Design & UX',
    skills: [
      'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Zeplin', 'Photoshop',
      'Illustrator', 'After Effects', 'UI Design', 'UX Design', 'Prototyping',
      'Wireframing', 'Design Systems', 'Motion Design', 'Brand Identity',
      'Typography', 'Color Theory', 'User Research', 'Usability Testing',
    ],
  },
  {
    category: 'Marketing & Growth',
    skills: [
      'SEO', 'SEM / Google Ads', 'Social Media Marketing', 'Content Marketing',
      'Email Marketing', 'Marketing Automation', 'HubSpot', 'Mailchimp',
      'Google Analytics', 'Facebook Ads', 'Copywriting', 'A/B Testing',
      'Conversion Rate Optimization', 'Affiliate Marketing', 'Influencer Marketing',
      'Growth Hacking', 'Brand Strategy', 'Public Relations',
    ],
  },
  {
    category: 'Product & Project Management',
    skills: [
      'Product Management', 'Agile', 'Scrum', 'Kanban', 'JIRA', 'Confluence',
      'Notion', 'Trello', 'Asana', 'Linear', 'Product Roadmapping',
      'User Stories', 'Sprint Planning', 'Stakeholder Management',
      'OKRs', 'KPIs', 'Product Analytics',
    ],
  },
  {
    category: 'Finance & Accounting',
    skills: [
      'Financial Modeling', 'Excel / Google Sheets', 'QuickBooks', 'SAP',
      'Xero', 'Financial Analysis', 'Budgeting', 'Forecasting', 'Auditing',
      'Tax Compliance', 'GAAP', 'IFRS', 'Accounts Payable', 'Accounts Receivable',
      'Payroll', 'Risk Management', 'Valuation', 'Private Equity',
    ],
  },
  {
    category: 'Soft Skills',
    skills: [
      'Communication', 'Leadership', 'Teamwork', 'Problem Solving',
      'Critical Thinking', 'Time Management', 'Adaptability', 'Creativity',
      'Emotional Intelligence', 'Negotiation', 'Conflict Resolution',
      'Presentation Skills', 'Mentoring', 'Strategic Thinking',
    ],
  },
];

// Flat sorted array — deduplicated. Useful for validation on write endpoints.
const ALL_SKILLS = [
  ...new Set(SKILLS_BY_CATEGORY.flatMap((c) => c.skills)),
].sort((a, b) => a.localeCompare(b));

module.exports = { SKILLS_BY_CATEGORY, ALL_SKILLS };
