# What the Terraform Folder and .tf Files Mean

A short, practical explanation of what the `terraform/` folder is and what it allows for the infrastructure you’re building.

---

## 1. What Is the Terraform Folder?

The **`terraform/`** folder is your **Infrastructure as Code (IaC)** setup for the **Genesis Dashboard** infrastructure (and only that—not tenant droplets).

- **Terraform** is a tool that talks to cloud providers (here: DigitalOcean) and creates/updates/destroys resources based on **config files**, not manual clicks.
- The **folder** holds those config files (`.tf`), plus **modules** (reusable building blocks) and **environments** (e.g. production).

So: **the Terraform folder = the “recipe” that defines and builds your dashboard’s servers, Redis, load balancer, and DNS.**

---

## 2. What Are .tf Files?

**.tf** files are Terraform **configuration files** written in HCL (HashiCorp Configuration Language). They describe *what* you want, not *how* to click through a UI.

- **`main.tf`** — Main resources: e.g. droplet, Redis cluster, load balancer, DNS records.
- **`variables.tf`** — Inputs (tokens, region, sizes, IPs) so you don’t hardcode secrets or env-specific values.
- **`outputs.tf`** — Values you want after apply (e.g. droplet IP, Redis URI) for use elsewhere or by the app.

Terraform reads all `.tf` in a directory together; the *names* (main, variables, outputs) are convention, not magic.

---

## 3. What Does This *Allow* for the Infrastructure We’re Building?

| Capability | What it means |
|------------|----------------|
| **Reproducibility** | Same `terraform apply` (with same vars) gives the same infra in another region or account. No “it worked on my screen” drift. |
| **Version control** | Infra changes are in git: you see diffs, roll back, and review before apply. |
| **Disaster recovery** | If something is deleted or an account is lost, you can recreate dashboard + Redis + LB + DNS from the repo and Terraform state. |
| **Documentation** | The code is the spec: what droplet size, which ports, which LB health check path (`/api/health`), etc. |
| **Safety** | `prevent_destroy`, `create_before_destroy`, and optional state locking (e.g. Terraform Cloud) reduce accidental tear-down and concurrent applies. |
| **Consistency** | Staging and production can use the same modules with different variables (e.g. `environments/production` vs `environments/staging`). |

So: **.tf files are the definition of your dashboard infra; Terraform is the engine that makes that definition real in DigitalOcean.**

---

## 4. How It Fits This Repo

- **`terraform/modules/`** — Reusable pieces:
  - **dashboard_droplet** — The Next.js app server (image, size, cloud-init, firewall, optional reserved IP).
  - **redis_cluster** — BullMQ Redis (version, nodes, eviction, trusted IPs/droplet).
  - **loadbalancer** — LB with HTTPS termination, health check to `/api/health`, forwarding to the app.
  - **dns** — Records (e.g. apex, www, api) pointing at the LB.

- **`terraform/environments/production/`** — One place that **uses** those modules and sets production values (region, sizes, domain, cert name, SSH keys, admin IPs). Running `terraform init` and `terraform apply` here provisions the real production dashboard infra.

So: **the Terraform folder is what allows you to build and rebuild the dashboard infrastructure from code, in a repeatable and reviewable way.**

---

## 5. Quick Mental Model

- **Terraform** = tool that creates/updates cloud resources from config.
- **.tf files** = the config (resources, variables, outputs).
- **terraform/ folder** = that config for your Genesis Dashboard (droplet, Redis, LB, DNS) plus docs (e.g. README) and state/backup guidance.

You are **not** required to use Terraform to run the app (e.g. you can create a droplet and Redis by hand), but if you do use it, this folder is what defines and drives that infrastructure.
