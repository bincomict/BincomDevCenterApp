import { AssessmentQuestion } from "../types";

export const TECH_TRACKS = [
  "Frontend Development (React, Vue, HTML, CSS)",
  "Backend Development (PHP / Laravel)",
  "Backend Development (Python / Django)",
  "Backend Development (Node.js / Express)",
  "Mobile App Development (React Native / Flutter)",
  "DevOps & Cloud Engineering",
  "Data Science & AI",
  "UI/UX Design",
  "Project Management (Tech)",
  "QA Testing & Automation",
  "Cybersecurity",
  "Digital Marketing",
  "C# Backend Development"
];

export const TRACK_QUESTIONS: Record<string, AssessmentQuestion[]> = {
  "Frontend Development (React, Vue, HTML, CSS)": [
    {
      id: "fe_1",
      question: "What is the primary language used to build the structure of a webpage?",
      options: ["HTML", "Python", "SQL", "C++"],
      correctAnswerIndex: 0
    },
    {
      id: "fe_2",
      question: "Which technology is mainly used to add colors, fonts, and layouts to websites?",
      options: ["CSS", "Express", "PostgreSQL", "Flutter"],
      correctAnswerIndex: 0
    },
    {
      id: "fe_3",
      question: "What is React primarily used for on the frontend?",
      options: ["A popular JavaScript library for building user interfaces", "A server firewall software", "A mobile operating system", "An editor application"],
      correctAnswerIndex: 0
    },
    {
      id: "fe_4",
      question: "When a designer provides a mockup that is technically challenging or impossible to implement within the sprint timeline, what is the best approach?",
      options: [
        "Proactively discuss the constraints with the designer and team to find a compromised, elegant alternative",
        "Ignore the mockup layout and build whatever is easiest to code without consulting anyone",
        "Refuse to start any frontend development work until the designer redesigns the entire layout",
        "Build it poorly and wait until the final release demo to mention that it was too difficult"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "fe_5",
      question: "You receive user feedback stating that a newly launched website navigation component is confusing. How do you respond?",
      options: [
        "Gather specific user interaction insights, collaborate with design, and iteratively refine the navigation UI for better clarity",
        "Assume the users are not tech-savvy and ignore the feedback completely",
        "Delete the navigation component entirely to prevent further complaints",
        "Publicly blame the QA tester for approving the original design layout"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Backend Development (PHP / Laravel)": [
    {
      id: "php_1",
      question: "What is PHP?",
      options: ["A server-side scripting language used to create dynamic webpages", "A design program for illustrations", "A front-end template formatting tool", "A text editing app"],
      correctAnswerIndex: 0
    },
    {
      id: "php_2",
      question: "What is Laravel?",
      options: ["A popular PHP web framework", "A web browser", "A physical database drive", "A cloud server system"],
      correctAnswerIndex: 0
    },
    {
      id: "php_3",
      question: "What is the database helper tool Eloquent in Laravel?",
      options: ["An Object-Relational Mapper (ORM) that makes querying database tables easy", "A program to play music and video", "A CSS file loader", "A hardware optimizer"],
      correctAnswerIndex: 0
    },
    {
      id: "php_4",
      question: "A critical production bug causes your Express/Laravel server response times to spike right before a major client demo. How should you react?",
      options: [
        "Collaborate with the team to analyze server logs, isolate the bottleneck, implement a quick fix, and communicate progress",
        "Panic and restart the server repeatedly without trying to find the root cause of the spike",
        "Blame the frontend developers for calling too many API endpoints before investigating",
        "Log off immediately and pretend to have connection issues until the demo finishes"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "php_5",
      question: "The project product manager requests a major change in database schema halfway through a sprint. How do you handle this?",
      options: [
        "Evaluate the technical impact, map out a clear migration plan with the team, and adapt the backend codebase",
        "Refuse the request, stating that the database structure cannot be modified once development starts",
        "Implement the database changes silently without updating migration files or team documentation",
        "Express anger in the group chat and request an immediate two-month extension"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Backend Development (Python / Django)": [
    {
      id: "py_1",
      question: "What is Python?",
      options: ["A simple, highly readable general-purpose programming language", "A web browser client", "An operating system version", "A graphics animation software"],
      correctAnswerIndex: 0
    },
    {
      id: "py_2",
      question: "What is Django?",
      options: ["A robust, high-level Python web framework", "A relational database storage unit", "A physical layout tool", "A text terminal application"],
      correctAnswerIndex: 0
    },
    {
      id: "py_3",
      question: "What is Django's default Admin Interface?",
      options: ["A built-in portal that allows quick database management out-of-the-box", "A security encryption device", "An image editing screen", "A chat application for users"],
      correctAnswerIndex: 0
    },
    {
      id: "py_4",
      question: "During a code review, a peer points out an optimization bug in your Django view query logic. What is the most constructive response?",
      options: [
        "Appreciate the feedback, discuss the query optimization, and implement the suggested improvements",
        "Reject the code review, take it personally, and insist your code is already perfect",
        "Silently ignore their review comments and merge your pull request regardless",
        "Find their older pull requests and leave overly critical comments as retaliation"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "py_5",
      question: "Your backend integration task is blocked because the external API documentation is outdated and fails continuously. What should you do?",
      options: [
        "Proactively communicate the blocker to your project lead, suggest alternatives, and keep the team updated",
        "Stop working and wait silently for someone to ask why your task is incomplete",
        "Repeatedly hit the failing API hoping it will suddenly start working on its own",
        "Mock the API responses with fake data and merge it without notifying anyone"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Backend Development (Node.js / Express)": [
    {
      id: "node_1",
      question: "What is Node.js?",
      options: ["A runtime environment that allows executing JavaScript on the server", "A styling web format", "A physical storage server computer", "A text file database tool"],
      correctAnswerIndex: 0
    },
    {
      id: "node_2",
      question: "What is Express?",
      options: ["A fast, lightweight web framework for Node.js", "An email writing program", "A graphics layout designer", "A database system folder"],
      correctAnswerIndex: 0
    },
    {
      id: "node_3",
      question: "Which file is the manifest that tracks dependencies in a Node.js project?",
      options: ["package.json", "index.html", "main.css", "dockerfile"],
      correctAnswerIndex: 0
    },
    {
      id: "node_4",
      question: "When developing a new set of API endpoints, how can you ensure smooth alignment with the frontend team?",
      options: [
        "Document request/response payloads in advance, ask for frontend team input, and freeze the contract together",
        "Code the endpoints independently and let the frontend developers find out the parameters by reading your server code",
        "Refuse to build any server code until the frontend team finishes building all of their interfaces",
        "Change the API response key structures randomly during development without letting anyone know"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "node_5",
      question: "Your Express web server crashes under high volume during a live marketing release. What is your immediate soft skill action?",
      options: [
        "Calmly coordinate with DevOps to inspect logs, provide clear status updates to stakeholders, and address the leak",
        "Turn off your phone, log out of Slack, and wait for the traffic spike to calm down on its own",
        "Delete the project repository and blame an external security hack for the outage",
        "Argue in public channels that marketing should not have run the campaign without your permission"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Mobile App Development (React Native / Flutter)": [
    {
      id: "mob_1",
      question: "What is React Native primarily used for?",
      options: ["Developing cross-platform mobile apps using JavaScript", "Building backend SQL database engines", "Running server virtualization pipelines", "Compiling browser-only applications"],
      correctAnswerIndex: 0
    },
    {
      id: "mob_2",
      question: "In Flutter, what is Dart?",
      options: ["The programming language used to build apps", "A styling sheet format", "The server database module", "A virtual machine manager"],
      correctAnswerIndex: 0
    },
    {
      id: "mob_3",
      question: "What does hot reload do in mobile development?",
      options: ["Updates application views immediately with new code changes without full rebuilds", "Turns off mobile phone screen power", "Increases CPU clock cooling speeds", "Clears user database records"],
      correctAnswerIndex: 0
    },
    {
      id: "mob_4",
      question: "A mobile QA tester reports that the app crashes on older Android phones due to low memory. How should you approach this?",
      options: [
        "Acknowledge the user impact, investigate the memory usage, and optimize image or memory resource allocation",
        "Inform the tester that users on older phones should simply buy newer mobile devices",
        "Mark the bug ticket as invalid because the app works fine on your high-end development simulator",
        "Quietly disable support for older Android operating system versions in the configuration without approval"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "mob_5",
      question: "The designer requests a complex fluid transition animation that is likely to impact performance on mid-range phones. What do you do?",
      options: [
        "Sit down with the designer to demonstrate the performance trade-offs and collaboratively find an elegant, optimized alternative",
        "Refuse to build any animations at all, claiming animations are bad for mobile performance",
        "Implement the complex animation exactly as specified, ignoring any resulting stutter or device overheating",
        "Ignore the mockup file and build simple instant screen cuts without consulting the design team"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "DevOps & Cloud Engineering": [
    {
      id: "devops_1",
      question: "What is the primary role of DevOps?",
      options: ["Uniting development and operations to improve deployment speeds", "Designing logos and graphic icons", "Answering standard customer emails", "Writing client page CSS style formatting"],
      correctAnswerIndex: 0
    },
    {
      id: "devops_2",
      question: "What is Git?",
      options: ["A distributed version control system to track code changes", "A physical hard drive model", "A cloud server dashboard", "A coding text workspace layout"],
      correctAnswerIndex: 0
    },
    {
      id: "devops_3",
      question: "What is Docker used for?",
      options: ["Packaging programs into standalone containers that run identically anywhere", "Writing rich desktop text notes", "Creating web browser programs", "Configuring browser font lists"],
      correctAnswerIndex: 0
    },
    {
      id: "devops_4",
      question: "A production pipeline failure causes a 15-minute system outage for users. What is the most constructive post-incident DevOps response?",
      options: [
        "Facilitate a blameless post-mortem with the team to find the structural root cause and automate future safeguards",
        "Identify the developer who caused the pipeline to break and publicly shame them in the general company channel",
        "Avoid discussing the outage entirely with anyone and hope no one notices it happened",
        "Blame the cloud hosting provider immediately and refuse to investigate internal configurations"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "devops_5",
      question: "A new security policy requires updating server network configuration scripts immediately. How do you handle this alongside other tasks?",
      options: [
        "Coordinate with development teams to schedule a low-impact maintenance window, test in staging, and apply the update",
        "Delay the security update indefinitely, arguing that security changes slow down developer release velocity",
        "Push the security changes straight to live production environments in the middle of a high-traffic work day",
        "Complain to engineering management that security standards are making your work too complicated"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Data Science & AI": [
    {
      id: "ds_1",
      question: "What is the primary goal of Data Science?",
      options: ["Extracting meaningful insights and knowledge from data patterns", "Designing web page button colors", "Securing hardware network sockets", "Formatting spreadsheet files manually"],
      correctAnswerIndex: 0
    },
    {
      id: "ds_2",
      question: "Which programming language is most popular in Data Science and Machine Learning?",
      options: ["Python", "PHP", "HTML", "Objective-C"],
      correctAnswerIndex: 0
    },
    {
      id: "ds_3",
      question: "What is Machine Learning?",
      options: ["An aspect of AI that allows computers to learn from patterns of data dynamically", "Cleaning physical computer keypads with machines", "The mechanical assembly lines in factories", "Running multiple printing monitors"],
      correctAnswerIndex: 0
    },
    {
      id: "ds_4",
      question: "An AI model you built produces biased recommendations against specific demographic groups. What is your response?",
      options: [
        "Report the bias to the team immediately, audit the training datasets, and work to rebuild or retrain the model fairly",
        "Ignore the recommendation bias as long as the overall statistical model accuracy remains high",
        "Hide the biased outputs from your business stakeholders to avoid having to retrain the model",
        "Defend the model by claiming that computer algorithms cannot be biased and that the results must be right"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "ds_5",
      question: "How should a Data Scientist explain a highly complex deep learning model to a non-technical corporate business team?",
      options: [
        "Focus on practical business impact, key predictive outcomes, and decision-making utility using simple analogies",
        "Present complex mathematical formulas, layer-by-layer neural nodes, and advanced gradient descent theory",
        "Tell the stakeholders that the model is too complex for them to understand and they must trust it blindly",
        "Invent simplified fake performance metrics to finish the presentation as quickly as possible"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "UI/UX Design": [
    {
      id: "ui_1",
      question: "What does UI stand for?",
      options: ["User Interface (the visual layout users see and click)", "User Identifier", "Uniform Indicator", "Universal Icon"],
      correctAnswerIndex: 0
    },
    {
      id: "ui_2",
      question: "What does UX stand for?",
      options: ["User Experience (how smooth, intuitive, and pleasant an interaction feels)", "User Extension", "Unified XML", "Utility Extraction"],
      correctAnswerIndex: 0
    },
    {
      id: "ui_3",
      question: "Which software tool is currently the industry standard for UI design prototypes?",
      options: ["Figma", "Microsoft Access", "Visual Studio Code", "VLC Player"],
      correctAnswerIndex: 0
    },
    {
      id: "ui_4",
      question: "The project product owner reviews your layout design and asks to simplify the main interface elements. How do you respond?",
      options: [
        "Listen to the usability goals of their request, discuss design trade-offs, and collaborate to simplify the interface",
        "Refuse to make changes, asserting that you are the creative expert and their layout ideas are wrong",
        "Silently ignore their review comments and send the original design mockup files directly to the developers",
        "Resign from the team immediately because your design decisions were questioned or criticized"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "ui_5",
      question: "A frontend developer points out that a responsive layout you designed is technically difficult to build. What is the best action?",
      options: [
        "Work directly with the developer to understand the technical constraints and adapt the layout details together",
        "Demand that they build the layout exactly as drawn in the mockup, regardless of standard CSS or time complexity",
        "File a complaint with the project manager claiming the frontend developer lacks the technical skills to build designs",
        "Silently modify the design files without telling the development team, leaving them to spot the changes"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Project Management (Tech)": [
    {
      id: "pm_1",
      question: "What is Agile in tech project management?",
      options: ["An iterative process focused on rapid, adaptive sprint cycles to ship software", "A server operating system pipeline", "A computer database engine structure", "A technical coding layout spec"],
      correctAnswerIndex: 0
    },
    {
      id: "pm_2",
      question: "What is a 'sprint' in Scrum frameworks?",
      options: ["A short, fixed period of time (e.g. 1-2 weeks) where a product module is completed", "A fast internet connection provider", "A rapid keyboard typing test session", "A server crash error state"],
      correctAnswerIndex: 0
    },
    {
      id: "pm_3",
      question: "What is the primary role of a Scrum Master or Technical PM?",
      options: ["Supporting team velocity by resolving blocker roadblocks and maintaining task backlogs", "Writing full front-end CSS files", "Building secure back-end index keys", "Configuring cloud server network subnets"],
      correctAnswerIndex: 0
    },
    {
      id: "pm_4",
      question: "Two senior engineers on your team disagree strongly on a technical architecture pattern, delaying progress. How do you handle this?",
      options: [
        "Facilitate a structured discussion to outline the pros/cons of both designs, align on a path, or call an architect to decide",
        "Tell them to argue it out privately and refuse to facilitate any joint meetings until they agree",
        "Arbitrarily choose one approach to save time, ignoring the other engineer's valid concerns",
        "Cancel the entire feature request from the product plan to avoid having to deal with the disagreement"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "pm_5",
      question: "The development team informs you that a highly anticipated feature will be delayed by one week. How do you communicate this?",
      options: [
        "Contact your stakeholders proactively, explain the technical reasons, present your recovery plan, and share the new timeline",
        "Hide the delay until the official release day, then shift the blame completely onto the development team",
        "Tell stakeholders everything is on track and force developers to work all night to meet the original deadline",
        "Blame the clients for asking too many questions to justify the schedule delay"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "QA Testing & Automation": [
    {
      id: "qa_1",
      question: "What is the main purpose of QA Testing?",
      options: ["Checking software systems to identify bugs and ensure high product quality", "Writing core design patterns in Figma", "Deploying docker nodes on secure platforms", "Routinely printing out log spreadsheets"],
      correctAnswerIndex: 0
    },
    {
      id: "qa_2",
      question: "What is a 'bug' in software systems?",
      options: ["An error or flaw that causes programs to mismatch desired requirements", "An actual physical crawling insect", "A cloud server machine system", "The memory size limits of standard laptops"],
      correctAnswerIndex: 0
    },
    {
      id: "qa_3",
      question: "What is automated software testing?",
      options: ["Using code scripts to run test suite scenarios automatically", "Letting computers write user requirements", "Shutting down servers dynamically when error happens", "A self-cleaning keyboard technology"],
      correctAnswerIndex: 0
    },
    {
      id: "qa_4",
      question: "You find a critical security bug in a feature that a developer spent three weeks coding. How do you communicate this?",
      options: [
        "Draft a clear bug report with step-by-step reproduction guidelines, and discuss the impact constructively with the developer",
        "Post the bug in the public company announcement channel to point out the developer's mistake",
        "Keep the bug to yourself to avoid causing the developer stress or hurting their feelings",
        "Email the company executives directly about the poor quality of the developer's work"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "qa_5",
      question: "With only one day left before a major product release, you have 50 pending test cases but only have time to run 10. What do you do?",
      options: [
        "Prioritize high-risk core paths and critical features, run those tests, and flag the coverage limitations to leadership",
        "Run 10 random test cases, mark all 50 as successfully passed, and sign off on the deployment",
        "Refuse to approve the release under any circumstances, demanding a two-week delay for full testing",
        "Rush through all 50 test cases superficially without verifying logs, ignoring any test failure alerts"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Cybersecurity": [
    {
      id: "cyber_1",
      question: "What is the main goal of Cybersecurity?",
      options: ["Protecting computer systems, devices, and networks from malicious access or damage", "Making sure webpages look colorful", "Helping employees print out files easily", "Increasing processor disk drive speeds"],
      correctAnswerIndex: 0
    },
    {
      id: "cyber_2",
      question: "What does multi-factor authentication (MFA) provide?",
      options: ["Stronger security by requiring multiple proofs of user identity", "Faster web browser connections", "Extra disk storage capacity for users", "Automatic English text formatting"],
      correctAnswerIndex: 0
    },
    {
      id: "cyber_3",
      question: "What is a Phishing attack?",
      options: ["Deceptive emails or messages designed to trick individuals into disclosing sensitive accounts", "A software program to count internet traffic", "Over-heating server CPUs via virtualization", "Deleting system directory files systematically"],
      correctAnswerIndex: 0
    },
    {
      id: "cyber_4",
      question: "An employee contacts you admitting they accidentally clicked on a phishing link and entered their login credentials. How do you respond?",
      options: [
        "Thank them for reporting it immediately, secure the account, reset passwords, and run a blameless security review",
        "Scold them harshly, block their access permanently, and threaten them with immediate termination",
        "Ignore the report, assuming the email firewall must have automatically blocked any potential threats",
        "Publish their mistake on the company announcement board to warn other employees about clicking links"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "cyber_5",
      question: "Employees complain that a new company password policy (monthly resets and long symbols) is too frustrating. How do you respond?",
      options: [
        "Organize a brief, helpful session to explain the security risk 'why' and show them how to use password managers",
        "Ignore their feedback completely, stating that security parameters are more important than employee efficiency",
        "Slightly weaken the company security rules secretly to stop the complaints",
        "Tell employees in a meeting that they are the biggest risk factor inside the company"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "Digital Marketing": [
    {
      id: "mkt_1",
      question: "What is SEO in Digital Marketing?",
      options: ["Search Engine Optimization (improving site rank to earn organic traffic on search engines)", "Server Encryption Operations", "Standard Email Optimizations", "Secure Event Outlets"],
      correctAnswerIndex: 0
    },
    {
      id: "mkt_2",
      question: "What does PPC stand for in online advertisements?",
      options: ["Pay-Per-Click", "Public Protocol Channel", "Page-Product-Code", "Profile Password Check"],
      correctAnswerIndex: 0
    },
    {
      id: "mkt_3",
      question: "What is dynamic email marketing primarily used for?",
      options: ["Sending rich campaigns to potential customers and keeping leads warmed", "Deleting spam mails", "Running automatic user password security upgrades", "Storing digital PDF files recursively"],
      correctAnswerIndex: 0
    },
    {
      id: "mkt_4",
      question: "An active paid marketing campaign is performing poorly and consuming budget quickly. What is your response?",
      options: [
        "Pause the campaign, review audience analytics and copy, make creative modifications, and perform a small test run",
        "Let the campaign run at full budget anyway, hoping performance will naturally correct itself after a few weeks",
        "Delete the company social ad manager account and declare that digital marketing is ineffective",
        "Blame the visual designer for making bad ad assets and refuse to launch any new campaigns"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "mkt_5",
      question: "The engineering team is preparing to launch a highly technical product feature. How should marketing align for the campaign?",
      options: [
        "Collaborate with developers to translate complex specifications into simple, client-facing benefits",
        "Write the campaign copy independently without consulting the engineering team on how the feature actually works",
        "Delay the marketing launch until the product has been active on production for six months",
        "Exaggerate the product features in ads to maximize conversion metrics even if the app cannot do what is advertised"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ],

  "C# Backend Development": [
    {
      id: "csharp_1",
      question: "What is C# (C-Sharp)?",
      options: ["A popular object-oriented programming language developed by Microsoft", "A web browser model", "A CSS preprocessor", "A physical database layout drive"],
      correctAnswerIndex: 0
    },
    {
      id: "csharp_2",
      question: "What is .NET?",
      options: ["An open-source developer framework for building apps with C#", "An internet domain extension register", "A graphic design workspace layout", "A security system code"],
      correctAnswerIndex: 0
    },
    {
      id: "csharp_3",
      question: "What is Entity Framework Core (EF Core) in C# .NET?",
      options: ["An Object-Relational Mapper (ORM) for accessing databases easily using .NET objects", "An operating system service", "A code compiling software application", "A multimedia audio player system"],
      correctAnswerIndex: 0
    },
    {
      id: "csharp_4",
      question: "A junior developer on your team is struggling to understand asynchronous programming (async/await) in C#. How do you support them?",
      options: [
        "Schedule a brief pairing session to explain the task-based asynchronous model using simple examples",
        "Instruct them to avoid using asynchronous methods entirely and write synchronous code instead",
        "Write all of their tasks for them silently to save time and prevent project delays",
        "Tell them to look it up on Google and criticize them during standup for not knowing basic patterns"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    },
    {
      id: "csharp_5",
      question: "You find some legacy, poorly-structured code in a C# controller that works but is very hard to maintain. What should you do?",
      options: [
        "Discuss refactoring options with the team, create a task in the backlog, and apply clean SOLID principles step-by-step",
        "Rewrite the entire controller file over the weekend without telling your team or updating unit tests",
        "Delete the controller code files completely to force another team member to write it again",
        "Ignore the controller file and hope you never receive any future maintenance tasks for that section"
      ],
      correctAnswerIndex: 0,
      isSoftSkill: true
    }
  ]
};
