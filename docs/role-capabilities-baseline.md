# Role Capabilities Baseline

This document defines the stable capability contract for each role and API endpoint.
It should be treated as the source of truth for frontend navigation and backend authorization checks.

## Roles

- `ADMIN`: full platform administration, including user lifecycle management.
- `CURATOR`: manages datasets and algorithms, runs queries.
- `USER`: read/query access only.

## Endpoint Capability Matrix

- `POST /user/login`: public (no token required).
- `POST /admin/createUser`: `ADMIN`.
- `POST /admin/getAllUsers`: `ADMIN`.
- `GET /admin/getUserById/{id}`: `ADMIN`.
- `POST /admin/editUser`: `ADMIN`.
- `POST /admin/deleteUsers`: `ADMIN`.
- `POST /file/getFiles`: `ADMIN`, `CURATOR`, `USER`.
- `GET /file/getFile/{id}`: `ADMIN`, `CURATOR`.
- `POST /file/editFile`: `ADMIN`, `CURATOR`.
- `POST /file/deleteFiles`: `ADMIN`, `CURATOR`.
- `POST /file/uploadFile`: `ADMIN`, `CURATOR`.
- `POST /algorithm/getAlgorithms`: `ADMIN`, `CURATOR`, `USER`.
- `GET /algorithm/getAlgorithm/{id}`: `ADMIN`, `CURATOR`.
- `POST /algorithm/addAlgorithm`: `ADMIN`, `CURATOR`.
- `POST /algorithm/editAlgorithm`: `ADMIN`, `CURATOR`.
- `POST /algorithm/deleteAlgorithms`: `ADMIN`, `CURATOR`.
- `POST /query/query`: `ADMIN`, `CURATOR`, `USER`.
- `GET /query/getFileColumns/{id}`: `ADMIN`, `CURATOR`, `USER`.
- `GET /query/getBudget/{id}`: `ADMIN`, `CURATOR`, `USER`.

## Frontend Navigation Contract

- `ADMIN` landing page: `/admin/User.html`.
- `CURATOR` landing page: `/curator/File.html`.
- `USER` landing page: `/user/Query.html`.
- Query UI assets must be loaded from shared files under `/shared/`.
- Request helper `request.js` must be loaded before page scripts that call `fetchWithAuth`.
