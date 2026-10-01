## PILLAR 6: QUALITY

### Value v Cost

#### Pillar Introduction

Definition. QUALITY is the team's ability to deliver the right value, to the right standard, at the right cost, and at the right time. It is not perfection for its own sake. In TEAM IQ, quality is the usefulness and worth of a product, service, process, or decision to the customer and the organisation. The 7 C's Prescription for Team Health® guides this through: Continue with the end in mind, Customer-centric design, Continuous customer feedback, Conduct value stream mapping, Corrective QA, Cost analysis through the lifecycle, and Cross-functional collaboration.

Why it matters. Teams can produce technically excellent work that customers do not value, or they can create short-term speed by pushing costs into maintenance, support, defects, and rework. Both are quality failures. QUALITY gives the team a way to balance value and cost explicitly, so decisions are made for the whole lifecycle rather than the next milestone alone.

Research summary. Google's research cautions against relying on a single output measure of effectiveness: lines of code, bugs fixed, and similar metrics can be misleading in isolation.2 The research instead combined different qualitative and quantitative perspectives. TEAM IQ applies the same discipline: quality is judged by customer and business outcomes, supported by necessary technical and operational guardrails.

Expected outcomes. Teams will set measurable "good enough" thresholds, minimise gold-plating, prioritise customer outcomes, use feedback to refine value, map waste in the delivery flow, and make lifecycle cost visible before major commitments.

### Chapter 6.1: Continue with the End in Mind and Value Stream Mapping

#### Learning Objective

Participants will be able to define quality as value delivered at an appropriate cost, map the flow of work to find waste, and apply the 7 C's Value Engineering Standard to define when work is good enough.

#### Explanation

Quality starts with the end in mind. Before beginning work, the team asks: What value should this create? For whom? How will we know? What will it cost to create, support, and change? Without these questions, quality becomes a subjective argument between people who want more polish and people who want more speed.

The 7 C's Value Engineering Standard (CVE) makes quality measurable. Every quality requirement — usability, security, reliability, accessibility, performance, accuracy, maintainability — needs a defined target and guardrail. Once the target is reached, further effort must compete honestly against the value of other priorities. Improvement beyond the required level may be useful, but it is not automatically good. It may be gold-plating: costly work that adds little stakeholder value.

Value stream mapping reveals where quality and value are lost before the customer sees anything. Waiting for approvals, unclear handoffs, duplicated data entry, late defect discovery, and unnecessary rework are all forms of cost. By visualising the end-to-end flow, the team sees the system rather than blaming the last person in the chain.

#### Practical Example

A team spends two additional weeks refining visual animation in a new internal application. The customer-facing TVI — successful task completion — has already exceeded target, while users are waiting for a higher-value reporting capability. Applying CVE, the team stops the animation work, deploys the current experience, and routes capacity to reporting. The decision improves total value rather than lowering standards.

#### Research Callout

Research callout — output is not the same as effectiveness. Google's research notes that measures such as lines of code written or bugs fixed can be inherently flawed as standalone effectiveness measures.2 CVE keeps the team focused on the value created and the cost incurred, not the volume of technical activity.

#### TEAM IQ Measurement: 7 C's Value Engineering Standard (CVE)

#### Exercises and Team Activities

#### Reflection Questions

#### Measurement Task

For one active work item, document the CVE threshold before development begins. At review, record whether the team stopped at the agreed threshold, exceeded it deliberately with a value rationale, or fell short. Estimate capacity saved or consumed by the decision.

### Chapter 6.2: Customer-Centric Design and Continuous Feedback

#### Learning Objective

Participants will be able to design around customer value, build continuous feedback mechanisms, and use 7 C's Outcome Metrics to judge quality by user and business impact rather than technical output alone.

#### Explanation

The most expensive quality failure is building the wrong thing perfectly. Customer-centric design starts with real customer needs, context, behaviour, and constraints. It does not mean giving every customer request equal weight. It means gathering enough evidence to understand the problem, test the proposed value, and improve the solution as customers respond.

The 7 C's Outcome Metrics (COM) moves the team's primary quality conversation from outputs to outcomes. Output measures still have a place: test coverage, defects, uptime, and delivery speed can be useful guardrails. But they do not tell the team whether customers can complete a task, whether retention has improved, whether revenue has changed, or whether the experience is worth the cost. COM links quality to the customer's actual experience and the business value that follows.

#### Practical Example

A team is proud that it has raised automated test coverage from 70% to 90%. Customer task completion, however, remains stuck at 58%. A COM review reveals that users are abandoning the journey because of confusing language, not system defects. The team keeps technical coverage as a guardrail but shifts the primary quality target to completion rate, then tests content and flow changes with customers.

#### Research Callout

Research callout — multiple perspectives create a fuller view. In its team-effectiveness work, Google combined leader, member, executive, and quantitative perspectives because each captured different aspects of effectiveness.2 COM applies the same logic to quality: technical evidence matters, but customer and business outcomes must also be visible.

#### TEAM IQ Measurement: 7 C's Outcome Metrics (COM)

#### Exercises and Team Activities

#### Reflection Questions

#### Measurement Task

Select one recently released feature. Create a COM scorecard with at least one customer measure, one business measure, and one technical guardrail. Review at 7, 30, and 60 days. Decide whether to scale, improve, reposition, or retire the feature from evidence.

### Chapter 6.3: Corrective QA, Cost Analysis, and Cross-Functional Collaboration

#### Learning Objective

Participants will be able to embed preventive quality practices, assess lifecycle cost, and coordinate across functions to protect value from development through maintenance and end of life.

#### Explanation

Corrective quality assurance is not only about finding defects at the end. It is about preventing avoidable failure by asking quality questions at the point where decisions are still cheap to change. Security, accessibility, operational support, customer communications, data protection, performance, legal constraints, and maintainability must be considered early enough to influence design.

Lifecycle cost analysis completes the quality picture. A feature may be cheap to build but expensive to maintain, support, secure, or retire. Conversely, an investment that looks expensive upfront may eliminate recurring cost or customer harm. The team's job is not to seek the lowest build cost; it is to make the value-versus-cost trade-off visible across the full life of the solution.

Cross-functional collaboration is essential because no single group holds the whole lifecycle view. Development understands build cost; operations sees reliability; support sees customer pain; finance sees economic effect; security sees risk; product sees desired value. Quality improves when these perspectives enter early, with a shared outcome rather than a late-stage approval gate.

#### Practical Example

A team wants to automate a customer-notification process. The initial business case shows a two-week build. A lifecycle review adds the cost of maintaining message templates, handling opt-out rules, monitoring delivery failures, responding to customer complaints, and retiring legacy channels. The team redesigns the solution to use an existing communications platform. Build time rises slightly, but lifecycle cost and compliance risk fall substantially.

#### Research Callout

Research callout — diverse information improves problem solving when it can be used. Woolley and colleagues' findings on social sensitivity and balanced turn-taking indicate that groups benefit when different perspectives can be expressed and integrated.1 Cross-functional quality reviews turn those perspectives into earlier, more complete decisions.

#### TEAM IQ Measurement: Lifecycle Value Review

#### Exercises and Team Activities

#### Reflection Questions

#### Measurement Task

For the next major initiative, complete a Lifecycle Value Review before approval to build. Record the number of material quality, cost, or risk issues identified before development. At the end of the first release, compare predicted lifecycle implications with early operational evidence and update the business case.
