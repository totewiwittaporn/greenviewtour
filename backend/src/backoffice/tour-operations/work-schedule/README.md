# Tour Operations / Work Schedule

Status: reserved API adapter folder, not an implemented endpoint.

Own this page’s request validation, transport handlers and response composition here when implemented. Delegate domain rules and writes to `backend/src/modules/operations`. Do not create parallel domain models, direct database access or duplicate services here.

Frontend counterpart: `frontend/backoffice/src/features/{menu}/{page}`.

Every protected request needs server-side permission and scope checks. Page names are navigation, not authorization. Dashboard/report composition must check access to each source. Routes and HTTP contracts are pending feature implementation; no public-web API contract is created by this scaffold.
