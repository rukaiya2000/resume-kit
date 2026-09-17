# Skills dictionary

The keyword scorer only recognizes skills listed here. Matching is case-insensitive and whole-word; aliases count as evidence of the skill.

- **Aliases:** other ways a job description or resume may write the skill. A resume that only uses an alias gets partial credit and a “reword” hint.
- **Rewrite-safe:** `no` means an alias is evidence only and must not be swapped into bullet text (e.g. SQLite is not SQL, “multi-agent” is not a drop-in for “agents”).
- Leave out single letters and common words (“R”, “C”, “Go”), which match too much. Use “Golang”.

Edit the tables to teach the scorer new skills; the category headings are only for readability.

_Adapted from ~/Documents/ats-scorer (Rizzume) @ 476e61d._

## Languages

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| Python |  | yes |
| TypeScript | ts | yes |
| JavaScript | js, es6 | yes |
| Java |  | yes |
| C++ | cpp | yes |
| C# | csharp | yes |
| Golang |  | yes |
| Rust |  | yes |
| SQL | mysql, postgresql, postgres, sqlite | no |
| Bash | shell scripting | no |

## ML / AI

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| Machine Learning | ml | yes |
| Deep Learning |  | yes |
| PyTorch | torch | yes |
| TensorFlow |  | yes |
| scikit-learn | sklearn | yes |
| LLM | large language model, large language models, llms | yes |
| RAG | retrieval-augmented generation, retrieval augmented generation | yes |
| LangChain |  | yes |
| LangGraph |  | yes |
| LangSmith |  | yes |
| Prompt Engineering | prompting | yes |
| Fine-tuning | finetuning, fine tuning | yes |
| Embeddings | embedding models, text embeddings | yes |
| Vector Database | vector databases, vector db, vector search, vector store | yes |
| Pinecone |  | yes |
| FAISS |  | yes |
| Chroma | chromadb | yes |
| Agents | ai agents, agentic, agentic workflows, agentic systems, multi-agent, multi agent | no |
| MCP | model context protocol | yes |
| Tool Calling | function calling, tool use | no |
| Model Evaluation | llm evaluation, evals, llm-as-judge | no |
| Red-teaming | red teaming, adversarial testing | yes |
| NLP | natural language processing | yes |
| Computer Vision | cv | yes |
| Hugging Face | huggingface | yes |
| OpenAI API | openai | yes |
| Anthropic API | anthropic, claude api | yes |
| MLOps |  | yes |

## Web & backend

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| Node.js | nodejs, node | yes |
| Express.js | express | yes |
| FastAPI | fastapi | yes |
| Django |  | yes |
| Flask |  | yes |
| REST API | rest apis, restful, rest | yes |
| GraphQL |  | yes |
| gRPC |  | yes |
| WebSockets | websocket | yes |
| Microservices | microservice architecture | yes |

## Frontend

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| React | react.js, reactjs | yes |
| Next.js | nextjs | yes |
| Redux |  | yes |
| HTML | html5 | yes |
| CSS | css3 | yes |
| Tailwind | tailwindcss, tailwind css | yes |

## Databases

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| PostgreSQL | postgres | yes |
| MySQL |  | yes |
| MongoDB | mongo | yes |
| Redis |  | yes |
| SQLite |  | yes |
| DynamoDB |  | yes |
| Elasticsearch |  | yes |
| Neo4j | graph database, graph databases | no |
| Kafka | apache kafka | yes |

## Cloud & DevOps

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| AWS | amazon web services | yes |
| GCP | google cloud, google cloud platform | yes |
| Azure |  | yes |
| Docker | containers, containerization | no |
| Kubernetes | k8s | yes |
| Terraform | infrastructure as code, iac | no |
| CI/CD | continuous integration, continuous deployment, continuous delivery | yes |
| GitHub Actions |  | yes |
| Jenkins |  | yes |
| Git | version control | no |
| Linux | unix | yes |
| Lambda | aws lambda, serverless | no |
| Step Functions | aws step functions | yes |
| SQS |  | yes |
| S3 |  | yes |
| CloudWatch |  | yes |
| Airflow | apache airflow | yes |

## Concepts

| Skill | Aliases | Rewrite-safe |
|---|---|---|
| Data Structures | data structures and algorithms, dsa | yes |
| Algorithms |  | yes |
| Distributed Systems |  | yes |
| System Design |  | yes |
| Object-Oriented Programming | oop, object oriented | yes |
| Unit Testing | automated testing, test-driven development, tdd | no |
| Code Review | code reviews | yes |
| Agile | scrum | no |
| Open Source | open-source | yes |
| Caching |  | yes |
| Concurrency | multithreading, parallelism | no |
