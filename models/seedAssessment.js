/**
 * Assessment Question Bank & Seeder
 * Seeds a curated, multiple-choice assessment bank (one per skill category)
 * the first time the server starts with an empty Assessment collection.
 */

const Assessment = require('./Assessment');

const BANK = [
  {
    skillCategory: 'Web Development',
    title: 'Web Development Fundamentals',
    description: 'HTML, CSS, JavaScript, and core web concepts.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'Which HTML tag is used to create a hyperlink?',
        options: ['<link>', '<a>', '<href>', '<nav>'],
        correctIndex: 1,
      },
      {
        question: 'Which CSS property controls the space inside an element, between its content and border?',
        options: ['margin', 'padding', 'spacing', 'inset'],
        correctIndex: 1,
      },
      {
        question: 'What does `===` do in JavaScript?',
        options: [
          'Assigns a value',
          'Compares values without type checking',
          'Compares value AND type',
          'Converts to boolean',
        ],
        correctIndex: 2,
      },
      {
        question: 'Which of the following is NOT a valid JavaScript data type?',
        options: ['string', 'number', 'boolean', 'fragment'],
        correctIndex: 3,
      },
      {
        question: 'What does the `fetch()` function return?',
        options: [
          'A string of HTML',
          'A Promise',
          'A JSON object directly',
          'An Array of elements',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    skillCategory: 'Mobile Development',
    title: 'Mobile Development Fundamentals',
    description: 'Core concepts for building mobile applications.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'Which language is primarily used for native iOS development?',
        options: ['Kotlin', 'Swift', 'Java', 'C#'],
        correctIndex: 1,
      },
      {
        question: 'Which language is primarily used for native Android development?',
        options: ['Swift', 'Kotlin', 'Objective-C', 'Ruby'],
        correctIndex: 1,
      },
      {
        question: 'What is a cross-platform mobile framework?',
        options: [
          'Code that only runs on one device',
          'Code that runs on iOS and Android from a single codebase',
          'A server-side framework',
          'A database manager',
        ],
        correctIndex: 1,
      },
      {
        question: 'What does REST API mean in a mobile context?',
        options: [
          'A way to store photos',
          'An interface for apps to communicate over HTTP',
          'A device sensor',
          'A UI design tool',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which tool is used to package and distribute mobile apps?',
        options: [
          'An app store / storefront',
          'A text editor',
          'A debugger only',
          'An SQL console',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    skillCategory: 'UI/UX Design',
    title: 'UI/UX Design Fundamentals',
    description: 'User experience and interface design principles.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'What does "UX" stand for?',
        options: ['User Experience', 'Universal XML', 'Unique Extension', 'User Execution'],
        correctIndex: 0,
      },
      {
        question: 'What is a wireframe?',
        options: [
          'A high-fidelity final design',
          'A low-fidelity layout showing structure and hierarchy',
          'A color palette',
          'A brand style guide',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which principle states that users should not have to remember information across parts of the interface?',
        options: [
          'Recognition over recall',
          'Consistency',
          'Feedback',
          'Affordance',
        ],
        correctIndex: 0,
      },
      {
        question: 'What is a "persona" in UX research?',
        options: [
          'A fictional character representing a user segment',
          'A real customer account',
          'A type of font',
          'A usability test script',
        ],
        correctIndex: 0,
      },
      {
        question: 'What does WCAG relate to?',
        options: [
          'Color theory',
          'Web content accessibility',
          'Mobile performance',
          'Typography scaling',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    skillCategory: 'Data Science',
    title: 'Data Science Fundamentals',
    description: 'Statistics, analysis, and data manipulation basics.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'Which library is commonly used for data manipulation in Python?',
        options: ['NumPy', 'Pandas', 'React', 'Flask'],
        correctIndex: 1,
      },
      {
        question: 'What is the mean of the dataset [2, 4, 6, 8]?',
        options: ['4', '5', '6', '8'],
        correctIndex: 1,
      },
      {
        question: 'What does "overfitting" mean in machine learning?',
        options: [
          'Model performs well on new data but poorly on training data',
          'Model learns the training data too well and fails to generalize',
          'Model has too few features',
          'Model trains too slowly',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which type of problem is predicting a categorical label?',
        options: ['Regression', 'Classification', 'Clustering', 'Dimensionality reduction'],
        correctIndex: 1,
      },
      {
        question: 'What is a common measure of central tendency?',
        options: ['Variance', 'Standard deviation', 'Median', 'Correlation'],
        correctIndex: 2,
      },
    ],
  },
  {
    skillCategory: 'DevOps',
    title: 'DevOps Fundamentals',
    description: 'CI/CD, containers, and infrastructure basics.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'Which tool is used to containerize applications?',
        options: ['Docker', 'Jenkins', 'Nginx', 'Terraform'],
        correctIndex: 0,
      },
      {
        question: 'What does CI/CD stand for?',
        options: [
          'Continuous Integration / Continuous Delivery',
          'Central Interface / Central Deploy',
          'Command Input / Command Display',
          'Continuous Index / Continuous Data',
        ],
        correctIndex: 0,
      },
      {
        question: 'Which tool is commonly used for declarative infrastructure provisioning?',
        options: ['Terraform', 'Grafana', 'Docker Compose only', 'npm'],
        correctIndex: 0,
      },
      {
        question: 'What is a "container registry"?',
        options: [
          'A place to store and distribute container images',
          'A list of running containers',
          'A monitoring dashboard',
          'A load balancer',
        ],
        correctIndex: 0,
      },
      {
        question: 'Which configuration file is used by GitHub Actions for workflows?',
        options: ['.gitlab-ci.yml', '.github/workflows/*.yml', 'Dockerfile', 'package.json'],
        correctIndex: 1,
      },
    ],
  },
  {
    skillCategory: 'Cybersecurity',
    title: 'Cybersecurity Fundamentals',
    description: 'Security principles, threats, and defenses.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'What is phishing?',
        options: [
          'A type of password hashing',
          'A social engineering attack that tricks users into revealing credentials',
          'A firewall rule',
          'A network encryption protocol',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is the purpose of multi-factor authentication (MFA)?',
        options: [
          'To slow down login',
          'To require more than one proof of identity',
          'To encrypt emails',
          'To block viruses',
        ],
        correctIndex: 1,
      },
      {
        question: 'What does HTTPS provide?',
        options: [
          'Faster page loads',
          'Encrypted communication between browser and server',
          'Free domain names',
          'Password storage',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is a "zero-day" vulnerability?',
        options: [
          'A bug fixed on day one',
          'A security flaw unknown to the vendor before being exploited',
          'A server with no patches after a year',
          'A password that expires daily',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which principle limits each user/system to the minimum permissions needed?',
        options: [
          'Defense in depth',
          'Least privilege',
          'Fail open',
          'Role confusion',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    skillCategory: 'Cloud Computing',
    title: 'Cloud Computing Fundamentals',
    description: 'Core cloud concepts, services, and deployment.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'What does IaaS stand for?',
        options: [
          'Infrastructure as a Service',
          'Internet as a Service',
          'Integrated App Server',
          'Interface as a Server',
        ],
        correctIndex: 0,
      },
      {
        question: 'Which cloud service provides managed, serverless compute?',
        options: ['AWS Lambda', 'S3 only', 'CloudFormation', 'Route 53'],
        correctIndex: 0,
      },
      {
        question: 'What is the main benefit of horizontal scaling?',
        options: [
          'Faster single-server CPU',
          'Adding more instances to handle load',
          'Reducing storage',
          'Lower latency on one node only',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which object storage service is used for files and media?',
        options: ['AWS S3', 'AWS EC2', 'AWS VPC', 'AWS IAM'],
        correctIndex: 0,
      },
      {
        question: 'What does "pay-as-you-go" mean in cloud billing?',
        options: [
          'Pay a flat yearly fee',
          'Pay only for the resources you consume',
          'Pay before usage',
          'No payment required',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    skillCategory: 'AI/ML',
    title: 'AI/ML Fundamentals',
    description: 'Machine learning and artificial intelligence concepts.',
    difficulty: 'intermediate',
    passScore: 70,
    questions: [
      {
        question: 'What is the difference between supervised and unsupervised learning?',
        options: [
          'No difference',
          'Supervised uses labeled data; unsupervised finds patterns in unlabeled data',
          'Supervised runs on GPUs only',
          'Unsupervised requires humans to label everything',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is a neural network \'activation function\'?',
        options: [
          'A way to start training',
          'A function that introduces non-linearity to a neuron output',
          'A data augmentation method',
          'A model optimizer',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which metric is used to evaluate a classification model?',
        options: ['Accuracy', 'Throughput', 'Latency', 'Memory'],
        correctIndex: 0,
      },
      {
        question: 'What is a "training set"?',
        options: [
          'The data used to fit (learn) the model',
          'The data used only for final deployment',
          'Unused historical data',
          'A set of hyperparameters',
        ],
        correctIndex: 0,
      },
      {
        question: 'Which algorithm is commonly used for large language models?',
        options: [
          'Transformers',
          'Linear regression only',
          'K-means only',
          'Bubble sort',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    skillCategory: 'Other',
    title: 'General Professional Skills',
    description: 'General professional and workplace fundamentals.',
    difficulty: 'beginner',
    passScore: 70,
    questions: [
      {
        question: 'What is the most effective way to prioritize competing tasks?',
        options: [
          'By urgency and importance',
          'By length of the task',
          'Randomly',
          'By who asked first only',
        ],
        correctIndex: 0,
      },
      {
        question: 'What does "deadline" generally mean?',
        options: [
          'A starting time',
          'The latest time a deliverable must be completed',
          'A team meeting',
          'A budget limit',
        ],
        correctIndex: 1,
      },
      {
        question: 'Which is a key element of clear professional communication?',
        options: [
          'Using vague wording',
          'Being concise and specific',
          'Avoiding all detail',
          'Sending without context',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is a "scope" in a project?',
        options: [
          'The budget only',
          'The work and deliverables included in the project',
          'The number of meetings',
          'The deadline only',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is the benefit of giving constructive feedback?',
        options: [
          'It improves performance and growth',
          'It is always negative',
          'It replaces documentation',
          'It increases workload only',
        ],
        correctIndex: 0,
      },
    ],
  },
];

/**
 * Seed the assessment bank if the collection is empty.
 * Intended to run once on server startup. Safe to call repeatedly.
 */
const seedAssessments = async () => {
  try {
    const count = await Assessment.countDocuments();
    if (count > 0) {
      return { seeded: false, count };
    }
    // Validate correctIndex within bounds before inserting
    const validBank = BANK.filter((a) =>
      a.questions.every((q) =>
        Array.isArray(q.options) && q.correctIndex >= 0 && q.correctIndex < q.options.length
      )
    );
    await Assessment.insertMany(validBank);
    return { seeded: true, count: validBank.length };
  } catch (err) {
    console.error('[seedAssessments] Failed to seed assessment bank:', err.message);
    return { seeded: false, count: 0, error: err.message };
  }
};

module.exports = { BANK, seedAssessments };
