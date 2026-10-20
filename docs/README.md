# ShulePlus Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [**Module Catalog**](./MODULES.md) | Product, support, developers | What each module does, how it works, and what features/folders are included |
| [**Module Training (video)**](./MODULES_VIDEO_TRAINING.md) / [Word](./ShulePlus_Module_Training_Guide.docx) | Trainers, marketing | One paragraph per module describing what it does (no ports or feature lists) |
| [**Module Ports**](./PORTS.md) | All developers | Unique local FE/BE ports for every module + how to check what’s running |
| [**Git Workflows**](./GIT_WORKFLOWS.md) | All developers | Branching, merging team work, resolving conflicts, and integrating into `develop` |
| [**Module Integration Guide**](./MODULE_INTEGRATION_GUIDE.md) | Platform team + module teams (HR, Finance, etc.) | End-to-end guide: build, register, assign, and access modules |
| [**Auth for Module Teams**](./AUTH_FOR_MODULE_TEAMS.md) | Module teams | How JWT auth works — why `check/organizationId`, `check/role`, `check/isAdmin` are not required |
| [Platform secrets template](../platform.env.example) | DevOps / all teams | Shared `JWT_ACCESS_SECRET` and service keys |
| [Sample Module README](../SampleModule/README.md) | Module developers | Reference microservice setup |
| [Authentication Architecture](../Authentication/ARCHITECTURE.md) | Platform team | IAM internals |

**New module team?** Start with [Module Integration Guide](./MODULE_INTEGRATION_GUIDE.md) and [Auth for Module Teams](./AUTH_FOR_MODULE_TEAMS.md), then copy [`SampleModule/`](../SampleModule/). Always pick unused ports from [PORTS.md](./PORTS.md).
