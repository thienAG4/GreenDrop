```xml
<Context>
    <Philosophy>
        This project values pragmatic simplicity over architectural purity. 
        The goal is to deliver a working, maintainable full‑stack application with a clear separation between server and client.
        We avoid unnecessary layers and focus on straightforward, readable code.
        
        We prioritize:
        1. Working software over over‑engineering.
        2. Readability over abstraction.
        3. Simplicity over ceremony.
    </Philosophy>
    <Scope>
        A full‑stack web application with a Node.js (Express) API backend and an AngularJS frontend.
        The backend follows a classic Routes → Controllers → Services pattern.
        The frontend uses AngularJS’s MVC/MVVM‑lite with controller‑as syntax, services, and factories.
    </Scope>
    <Actors>
            <Actors>
        - The Developer (You): Writes all layers, from database queries to user interface.
        - Backend Developer: Handles Express routes, controllers, services, and MySQL queries.
        - Frontend Developer: Implements AngularJS controllers, services, views, and Bootstrap UI.
    </Actors>
    </Actors>
</Context>

<Architecture>
    <Backend_Pattern>
        SIMPLE MVC (Routes → Controllers → Services)
        
        [ Client Request ]
               ⬇
        [ Routes ]          → Defines endpoints, passes request to controller
               ⬇
        [ Controllers ]     → Parses request, calls services, sends response
               ⬇
        [ Services ]        → Business logic, database queries (via raw SQL or query builder)
               ⬇
        [ MySQL Database ]
    </Backend_Pattern>

    <Frontend_Pattern>
        ANGULARJS MVC + SERVICE LAYER
        
        [ View (HTML Template) ]        → Binds to controller via `controllerAs` syntax
               ⬇ (user action)
        [ Controller ]                  → Handles UI logic, calls services
               ⬇
        [ Service / Factory ]           → Makes `$http` calls to backend API
               ⬇ (Promise)
        [ Controller ]                  → Updates `vm` properties, View reflects changes
    </Frontend_Pattern>
</Architecture>

<Requirements>
    <Backend_Tech_Stack>
        - Runtime: Node.js v20.20.2
        - Framework: Express.js
        - Database driver: mysql2 (promise‑based)
        - Utility: dotenv for environment variables
        - Code style: no linter/formatter forced, but keep it clean
        - Testing: none
        - CI/CD: none
    </Backend_Tech_Stack>

    <Frontend_Tech_Stack>
        - Framework: AngularJS 17.3.17
        - CSS Framework: Bootstrap (loaded via CDN)
        - Styling: plain CSS or SCSS (optional), keep it simple
        - HTTP: `$http` service
        - Architecture: one module (`app`), controllers, services/factories
        - No modern Angular (v2+), No TypeScript, No Signals
    </Frontend_Tech_Stack>

    <Database_Infrastructure>
        - Database: MySQL 8
        - Schema management: manual SQL scripts (no migrations tool)
        - Connection: single pool created with `mysql2/promise`
        - Query style: plain SQL or a light query builder (e.g., Knex if you want)
    </Database_Infrastructure>
</Requirements>

<Constraints>
    <DO>
        <Universal>
            - DO keep folder structure flat: `backend/` and `client/`.
            - DO use meaningful variable and function names.
        </Universal>

        <Backend>
            - DO keep controllers thin: only request parsing and response sending.
            - DO put all SQL logic inside service files or a dedicated `db.js` helper.
            - DO use environment variables for DB credentials (`.env` file).
            - DO return JSON responses with a consistent shape: `{ data, message }` or `{ error }`.
        </Backend>

        <Frontend>
            - DO use `controllerAs` syntax (never `$scope` for data binding).
            - DO place all API calls inside AngularJS services/factories, never in controllers.
            - DO use one‑way data flow: user action → controller → service → API.
            - DO prefix private scope variables with `vm.` (e.g., `vm.users = []`).
            - DO leverage Bootstrap classes for layout, buttons, tables, etc. to ensure a consistent, responsive UI without excessive custom CSS.
        </Frontend>
    </DO>

    <DO_NOT>
        <Backend>
            - DO NOT put SQL queries inside route handlers.
            - DO NOT expose raw database errors to the client; wrap them in a generic error response.
            - DO NOT use global variables for request‑scoped data.
        </Backend>

        <Frontend>
            - DO NOT use `$scope` for data that belongs to a controller (use `controllerAs`).
            - DO NOT make HTTP calls directly from controllers; always go through a service.
            - DO NOT hardcode API base URLs; use an Angular constant or configuration block.
            - DO NOT use TypeScript (pure JavaScript is fine).
            - DO NOT override Bootstrap styles unnecessarily; use Bootstrap utilities and classes first.
        </Frontend>
    </DO_NOT>

    <SUCCESS_METRICS>
        1. "The Run Test": Can you clone the repo, run `npm install` in `backend/`, `npm start`, open `client/index.html` in a browser, and see data?
        2. "The Readability Test": Can a developer understand the complete flow from a button click to a database query in under 10 minutes?
        3. "The Swap Test": Can you change the database table name in one file and have the whole feature still work?
    </SUCCESS_METRICS>
</Constraints>

<Coding_Styles>
    <JavaScript_Backend>
        <Naming>
            - Files: `kebab-case` (e.g., `user-service.js`)
            - Functions: `camelCase` (e.g., `getUserById`)
            - Variables: `camelCase`
            - Classes/Constructors: `PascalCase` (if used)
        </Naming>
        <Formatting>
            - Indentation: 2 spaces
            - Quotes: single quotes `'`
            - Semicolons: optional, but be consistent
        </Formatting>
        <Example_Good>
```javascript
// user.service.js
const db = require('../db');

async function getUserById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}

module.exports = { getUserById };
```
        </Example_Good>
    </JavaScript_Backend>

    <JavaScript_Frontend>
        <Naming>
            - Files: `kebab-case` (e.g., `user-list.controller.js`)
            - Controllers: `PascalCase` name, e.g., `UserListController`
            - Services: `camelCase`, e.g., `userService`
            - Variables in controller: attach to `var vm = this;`
        </Naming>
        <Formatting>
            - Indentation: 2 spaces
            - Quotes: single quotes
        </Formatting>
        <Example_Good>
```javascript
// user-list.controller.js
angular.module('app').controller('UserListController', UserListController);

function UserListController(userService) {
    var vm = this;
    vm.users = [];
    vm.loading = true;
    
    userService.getAll().then(function(response) {
        vm.users = response.data;
    }).finally(function() {
        vm.loading = false;
    });
}
```
        </Example_Good>
    </JavaScript_Frontend>

    <SQL>
        <Naming>
            - Tables: `snake_case`, plural (e.g., `users`, `order_items`)
            - Columns: `snake_case` (e.g., `created_at`)
        </Naming>
        <Keywords>
            - ALWAYS UPPERCASE (e.g., `SELECT * FROM users WHERE id = 1;`)
        </Keywords>
    </SQL>
</Coding_Styles>

<Folder_Structure>
```
project-root/
├── backend/
│   ├── node_modules/
│   ├── routes/
│   │   └── users.js
│   ├── controllers/
│   │   └── users.controller.js
│   ├── services/
│   │   └── users.service.js
│   ├── db.js               (connection pool)
│   ├── .env                (DB_HOST, DB_USER, DB_PASS, DB_NAME)
│   ├── app.js              (Express setup)
│   └── package.json
├── client/
│   ├── index.html
│   ├── app.js              (AngularJS module definition & config)
│   ├── controllers/
│   │   └── user-list.controller.js
│   ├── services/
│   │   └── user.service.js
│   └── css/
│       └── style.css
└── .gitignore
```
</Folder_Structure>

<Workflow>
    <New_Feature_Checklist>
        1. **Database:** Write an SQL script to create/alter tables manually. Execute it against MySQL.
        2. **Backend Service:** Create a service function with the SQL query in `services/`.
        3. **Backend Controller:** Create a controller that calls the service and sends JSON.
        4. **Backend Route:** Wire the route to the controller in `routes/`.
        5. **Frontend Service:** Create an AngularJS service/factory that calls the backend endpoint via `$http`.
        6. **Frontend Controller:** Create a controller that uses the service and exposes data on `vm`.
        7. **Frontend View:** Write HTML template with `ng-repeat`, `ng-click` etc., bound to the controller. Apply Bootstrap classes for styling.
        8. **Manual Test:** Open `client/index.html` in browser and verify the feature works end‑to‑end.
    </New_Feature_Checklist>
</Workflow>

<Project_Specific_Lessons>
    <Two_Frontends>
        This repo has two separate AngularJS apps that share no code: `client/`
        (module `app`, customer storefront, port 8080) and `admin/` (module
        `adminApp`, admin panel, port 8081, own login/session — a different
        origin, so logging into one does not log you into the other). Don't
        add cross-references or import one app's controller into the other.
    </Two_Frontends>

    <Docker_Volume_Staleness>
        `backend_uploads` and `db_data` Docker volumes are seeded from the
        image/SQL files only on first creation. Editing `backend/uploads/`,
        `backend/init.sql`, or `backend/create_database.sql` after the
        volumes already exist is NOT picked up by `docker compose up --build`
        alone — run `docker compose down -v && docker compose up -d --build`
        to force a reseed. After any `init.sql` edit + reseed, check `docker
        logs greendrop-mysql | grep -i error` — one broken `INSERT` aborts
        the whole seed file silently partway through, which can wipe out
        entire tables' worth of seed data with no obvious symptom.
    </Docker_Volume_Staleness>

    <No_Headless_Browser>
        This sandbox typically has no working headless browser (Playwright
        installs, but the Chromium binary fails to launch — missing shared
        libs, no sudo to install them). Verify backend changes via `docker
        compose` + curl, and frontend changes via `node --check` on every
        touched `.js` file plus careful static review, rather than burning
        time re-attempting a real browser launch. If a real browser is ever
        available, re-verify CSS/layout changes visually — some bugs here
        (specificity, flex-wrap overlap) are only visible in a rendered page.
    </No_Headless_Browser>

    <MySQL_Datetime_Gotchas>
        `backend/config/db.js` sets `dateStrings: true`, so datetime columns
        come back as `"YYYY-MM-DD HH:MM:SS"` (space separator, no timezone
        marker). Two recurring bug classes result:
        - Parsing one with plain `new Date(str)` on the frontend reads it as
          *local* time, not UTC, silently breaking countdowns/deadlines for
          any non-UTC-0 user. Parse as UTC explicitly:
          `new Date(str.replace(' ', 'T') + 'Z')`.
        - AngularJS's built-in `date` filter only matches ISO-8601 and
          silently no-ops (echoes the raw string) on this format — normalize
          the separator first before piping through `| date:` (see the
          `gdDate`/`gd-date` filter pattern already used in `admin/` and `client/`).
        Conversely, writing a JS `Date` back to a `DATETIME` column (e.g. from
        an AngularJS `datetime-local` input, which `$http` serializes via
        `.toISOString()`) fails MySQL's strict mode outright — convert with
        `backend/utils/mysql-datetime.js`'s `toMysqlDatetime()` before any
        INSERT/UPDATE rather than reinventing this per feature.
    </MySQL_Datetime_Gotchas>

    <Shared_UI_Components>
        Reuse before adding new ones: `notifyModalService.success('message')`
        (`client/services/notify-modal.service.js`) for a global
        auto-dismissing success toast — skip it on flows that already have
        their own dedicated multi-step success screen.
        `placeholderImagesService.named(filename)`
        (`client/services/placeholder-images.service.js`) for one specific
        design-mandated image file; `.random()`/`.randomN()` for decorative
        filler only — don't add specifically-named assets to the random pool.
    </Shared_UI_Components>

    <CSS_Specificity_Traps>
        - A bare-element selector scoped only by an ancestor class (e.g.
          `.gd-hero-search input`) matches every input under that ancestor,
          not just the one component it was written for — check what else
          lives under that ancestor before assuming isolation.
        - A rule targeting an element directly always wins over one inherited
          from an ancestor, regardless of the ancestor rule's specificity
          (e.g. a global `h1, h2, h3 { color: ... }` beats a more specific
          `.dark-banner .content { color: white }` for an `<h3>` inside it) —
          give the child its own explicit override rather than relying on
          inheritance.
        - Flex children need explicit `flex-shrink-0` (usually paired with
          `text-nowrap`) or they get squeezed below their content width
          whenever a sibling (e.g. a `width: 100%` input) wants more room.
    </CSS_Specificity_Traps>

    <External_API_Spend>
        Before calling a real, rate-limited/billed third-party API from this
        app (e.g. the Combo Builder's AI preview, gated by `PIXAZO_API_KEY`),
        check whether the key is actually set in the running environment
        first (e.g. `docker exec greendrop-backend printenv PIXAZO_API_KEY`)
        — don't assume a rebuild reset it to placeholder mode. If it's set,
        ask before making a real call; a "regression check" that fires the
        real endpoint is a real billed/quota-consuming request, not a free
        smoke test. Branch-level logic (error mapping, persistence) can still
        be verified safely via a mocked `fetch`.
    </External_API_Spend>

    <Verify_Third_Party_Docs>
        When integrating a new third-party API, a documentation page (even
        fetched as raw HTML, not an AI summary) can still describe the wrong
        endpoint/version. Send one real probe request (a bogus API key is
        fine — it's free and confirms the request schema is accepted before
        failing only on auth) before treating the integration as verified.
    </Verify_Third_Party_Docs>
</Project_Specific_Lessons>
```