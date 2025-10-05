const backendUrl = "http://localhost:5009"; // Replace with your backend URL

let csrfToken = null; // Store the CSRF token globally

async function fetchCsrfToken() {
  try {
    const response = await fetch(`${backendUrl}/csrf-token`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    csrfToken = data.csrfToken; // Store the token from the response
    console.log("CSRF token fetched and stored:", csrfToken);
    return csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
}

// Fetch CSRF token on page load and wait for it
fetchCsrfToken().then(() => {
  console.log("CSRF token initialization complete");
}); // Call this function to fetch the CSRF token on page load

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path === "/") {
    const loginBtn = document.getElementById("loginBtn");
    const messageDiv = document.getElementById("message");

    fetch(`${backendUrl}/user/check-auth`, {
      method: "GET",
      credentials: "include", // Send cookies with the request
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Not authenticated");
        }
      })
      .then((data) => {
        if (data.authenticated) {
          window.location.href = "/dashboard";
        }
      })
      .catch((error) => {
        console.log("User not authenticated, staying on login page");
      });

    loginBtn.addEventListener("click", () => {
      window.location.href = `${backendUrl}/auth/google`;
    });

    // Check for JWT cookie (you might need a helper function for this)
    //if (getCookie("jwt")) {
    //  window.location.href = "/profile";
    //}
  }
  if (path === "/dashboard") {
    console.log("Dashboard page");
    const welcomeMessage = document.getElementById("welcomeMessage");
    const logoutBtn = document.getElementById("logoutBtn");
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get("from") === "login";

    // Check for JWT cookie
    //const jwtCookie = getCookie("jwt");
    //console.log("JWT Cookie:", jwtCookie);
    //if (!jwtCookie) {
    //  window.location.href = "/login";
    //}

    // Fetch profile data
    fetch(`${backendUrl}/user/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": csrfToken || getCookie("XSRF-TOKEN"), // Include CSRF token
      },
      credentials: "include", // Ensures cookies are sent with the request
    })
      .then((response) => {
        console.log("Profile fetch status:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Profile data:", data);
        //welcomeMessage.textContent = data.message;
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
        if (!fromLogin) {
          // Only redirect if not already from login
          window.location.href = "/login?from=profile";
        }
      });
    
    logoutBtn.addEventListener("click", async () => {
      let tokenToSend = csrfToken; // Get current global token
      console.log("inside event listener")
      // If the global token is missing, try fetching it NOW and wait
      if (!tokenToSend) {
        console.log("CSRF token missing on logout click, fetching...");
        tokenToSend = await fetchCsrfToken();
      }

      // Double-check if we have a token (either initially or after fetching)
      if (tokenToSend) {
        console.log(
          "CSRF token available, proceeding to logout with token:",
          tokenToSend
        );
        performLogout(tokenToSend); // Pass the confirmed token to use
      } else {
        console.error("Failed to obtain CSRF token. Cannot log out securely.");
        // Optionally display an error message to the user
        alert(
          "Logout failed: Could not verify request security. Please refresh and try again."
        );
      }
    });

    //logoutBtn.addEventListener("click", async () => {
    //  if (!csrfToken) {
    //    console.error("CSRF token not available, fetching again...");
    //    await fetchCsrfToken();
    //  }
    //  if(csrfToken) {
    //    console.log("CSRF token available, proceeding to logout...",csrfToken);
    //    performLogout();
    //  }
    //  else {
    //    console.log("Failed to fetch CSRF token, cannot log out.");
    //  }
    //});
    //function performLogout() {
    //  fetch(`${backendUrl}/auth/logout`, {
    //    method: "GET",
    //    headers: {
    //      "Content-Type": "application/json",
    //      "X-XSRF-TOKEN": csrfToken, // Use the stored CSRF token
    //    },
    //    credentials: "include",
    //  })
    //    .then((response) => {
    //      console.log("Logout response status:", response.status);
    //      if (response.status === 403) {
    //        return response.json().then((data) => {
    //          throw new Error(`Forbidden: ${data.message}`);
    //        });
    //      }
    //      if (response.redirected) {
    //        window.location.href = response.url;
    //      }
    //    })
    //    .catch((error) => console.error("Error logging out:", error));
    //}
  }
});
function performLogout(tokenToUse) {
    console.log(`Sending logout request with X-XSRF-TOKEN: ${tokenToUse}`); // Debug log
    fetch(`${backendUrl}/auth/logout`, {
        method: "GET", // Consider changing to POST or DELETE for logout actions
        headers: {
            // "Content-Type": "application/json", // Not strictly needed for GET, but harmless
            "X-XSRF-TOKEN": tokenToUse, // Use the token passed as an argument
        },
        credentials: "include", // Send cookies (including XSRF-TOKEN cookie)
    })
    .then(response => {
        console.log("Logout response status:", response.status);
        console.log("Logout response redirected:", response.redirected);
        console.log("Logout response url:", response.url);

        if (response.status === 403) {
            // Try to parse the JSON body for a more specific error
            return response.json().then(data => {
                 throw new Error(`Forbidden: ${data.message || 'CSRF token validation failed'}`);
            }).catch(() => {
                 // If parsing fails, throw a generic 403 error
                 throw new Error('Forbidden (403): CSRF token validation likely failed.');
            });
        }

        // If the server handled the redirect (common case)
        if (response.redirected) {
            window.location.href = response.url; // Follow the redirect
            return; // Stop processing
        }

        // If the server responded with OK (200-299) but didn't redirect
        if (response.ok) {
             console.log("Logout successful on server, redirecting client-side.");
             // Manually redirect because the server didn't
             window.location.href = '/login'; // Or "/" or "http://localhost:8080/"
             return;
        }

        // Handle other non-OK, non-403 errors
        throw new Error(`Logout failed with status: ${response.status}`);

    })
    .catch((error) => {
         console.error("Error during logout fetch:", error);
         // Display a user-friendly error message
         alert(`Logout failed: ${error.message}`);
    });
}

//document.addEventListener("DOMContentLoaded", () => {
//  const path = window.location.pathname;
//
//  if (path === "/profile") {
//    fetchProfileData();
//  }
//});
//
//function fetchProfileData() {
//  fetch("http://localhost:5009/profile", {
//    // Adjust URL to your backend
//    method: "GET",
//    headers: {
//      "Content-Type": "application/json",
//      "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"), // Include CSRF token if required
//    },
//    credentials: "include", // Ensures cookies are sent with the request
//  })
//    .then((response) => {
//      if (!response.ok) {
//        // If the backend returns 401 or similar, redirect to login
//        throw new Error("Not authenticated");
//      }
//      return response.json();
//    })
//    .then((data) => {
//      // Display profile data
//      document.getElementById("welcomeMessage").textContent = data.message;
//    })
//    .catch((error) => {
//      console.error("Error:", error);
//      window.location.href = "/login"; // Redirect if authentication fails
//    });
//}

// Helper function to get a cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

// Function to get CSRF token (call this on page load of login and profile)

// Call getCsrfToken on page load for both login and profile pages
//if (
//  window.location.pathname === "/login" ||
//  window.location.pathname === "/profile"
//) {
//  fetchCsrfToken();
//}
