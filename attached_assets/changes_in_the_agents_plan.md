We want to opensource our project. so after Phase 2 of the agent's plan, we are executing 
## Phase 2.5: Open-Sourcing the project
Main idea is to create a sandboxed demo for guest users. They can see everything but in a static sense. We hope that no one exploits the site's vulnerabilities, and in the spirit of this project being open-source, report this vulnerabilities to us. We are trying to streamline CFI's 3D Printing workflow, so please assist us in doing so. We also request anyone seeing this from Cybersecurity Clubs of any institution to help us check the site for vulnerabilities. Thank you.

The prompt was given to the agent:
````markdown
We are shifting direction and plan to make this site open source. This does not mean print orders are available to everyone—instead, your task is to create a demo version of the website for guest users. In this demo mode:

- Submitting orders will not send anything to us.
- Any settings changes will not affect any real users or data.
- All changes are non-persistent; this is a static, non-destructive demo.

Replace the following section of the code:
```html
{Quick Info */}
    <div className="mt-8 grid grid-cols-2 gap-4 text-center">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-cyan-500 text-2xl font-bold mb-1">24/7</div>
            <div className="text-xs text-gray-400">Queue Access</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-cyan-500 text-2xl font-bold mb-1">1-7</div>
            <div className="text-xs text-gray-400">Days Processing</div>
        </div>
    </div>
```
with a new section that reads:

> "In the light of open-sourcing our project (thanks to Netlify for inspiring and supporting open source), we are offering a demo version of our site.  
> Use the 'Login as Guest' button below to experience the platform.  
> Any actions you take here are for demonstration only and will not be saved or processed.  
> For more details, see our README page explaining all demo functionalities."

Include a prominent 'Login as Guest' button that logs the user in with guest permissions, and a link to a README/demo info page.

**Security and UX notes:**
- All demo actions must be sandboxed—no real data is stored or processed.
- Guest sessions must be strictly limited in scope and permissions; never expose admin or sensitive features.
- Block all API calls that could mutate data or trigger real processes; mock responses as needed.
- Clearly indicate demo mode is active to avoid confusion.
- Consider rate-limiting guest actions and monitoring for abuse.

**Design recommendation:**  
Prefer keeping the demo on the same codebase and domain as production, but restrict guest permissions so no real actions can be taken. This ensures the demo accurately reflects the real product while maintaining security and ease of maintenance. If you want extra isolation, you can deploy the demo at a separate subdomain, but permission-based restriction is usually sufficient.

**Addressing vulnerabilities:**  
- Prevent privilege escalation from guest to real accounts.
- Ensure demo mode cannot access or leak real user data.
- Clean up any guest session data after logout or timeout.
- Monitor for automated misuse or abuse of demo endpoints.

Let me know if you need the tree structure of our webpage or further implementation details.


````

This is the plan created by the agent

### Sub-phase 1: Implement Guest Authentication and Role

- **Create a "GUEST" Role:**  
  Add a new `GUEST` role to the `UserRole` enum in `shared/schema.ts`.

- **Implement Guest Login:**  
  In `auth.ts`, create a new `signInAsGuest` function. This function will create a temporary, client-side-only user object with the `GUEST` role. It will not make any API calls or interact with Firebase.

- **Update Login.tsx:**  
  Wire up the "Login as Guest" button to call the new `signInAsGuest` function.

---

### Sub-phase 2: Sandbox the Application for Guests

- **Block Data-Mutating API Calls:**  
  In `queryClient.ts`, modify the `apiRequest` function to check if the user has the `GUEST` role. If so, block any `POST`, `PATCH`, or `DELETE` requests and return a mock success response. This will prevent any changes to the database.

- **Update ProtectedRoute.tsx:**  
  Modify the `ProtectedRoute` component to allow guests to view all pages, including the admin and superadmin dashboards, but in a read-only state.

- **Display a "Demo Mode" Banner:**  
  Create a new component that displays a prominent banner at the top of the page when a guest user is logged in, making it clear that they are in a demo environment.

---

### Sub-phase 3: Create the README/Demo Info Page

- **Create a README.md file:**  
  Create a new `README.md` file in the root of the project with a detailed explanation of the demo mode, its limitations, and how to use it.

- **Create a Readme.tsx page:**  
  Create a new page at `client/src/pages/Readme.tsx` that fetches and displays the content of the `README.md` file.

- **Add a Route:**  
  Add a new route in `App.tsx` for