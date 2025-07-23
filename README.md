# fhir-patient

Prereq:
1. clone hapi-fhir-jpaserver-starter
2. docker compose up

To run the code:

1. after initial clone of the repo, run "pnpm install"
2. install libraries:
    pnpm add express -w
    pnpm add cors -w
    pnpm add fhir-kit-client -w
3. run "pnpm post-setup" 
4. run "pnpm run dev:with-callback"

PAGE1: Add, delete, edit patients from unauthenticated FHIR server
PAGE2: SMART FHIR patient app for EPIC server