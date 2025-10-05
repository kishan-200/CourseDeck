const backendUrl = "http://localhost:5009"; // Replace with your backend URL

const courseBackendUrl = "http://localhost:5002";

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

fetchCsrfToken().then(() => {
  console.log("CSRF token initialization complete");
});

async function getUserCart(userId) {
  try {
    const response = await fetch(`${courseBackendUrl}/cart/${userId}`);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data; // Returning the response object containing cart courses

  } catch (error) {
    console.error("Error fetching cart courses:", error);
    return { error: error.message }; // Return error info if needed
  }
}
const navItemsContainer = document.getElementById("nav-items");


document.addEventListener("DOMContentLoaded", async () => {
  //const courseId = event.target.dataset.id;
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
      console.log(data);
      if (data.authenticated) {
        const userId = data.userId;
        getUserCart(userId).then((cartData) => {
          let courses = cartData.courses;
          courses.forEach((item) => {
            let cartItem = {userId: userId , courseId : item.courseId._id}
            console.log(cartItem);
            if (cartItemsContainer) {
              const div = document.createElement("div");
              div.classList.add("cart-item");
              div.innerHTML = `
            
                  <h3>${item.courseId.name}</h3>
                  <p style="padding-right: 10px">$ ${item.courseId.price}</p>
                  <button data-user-id=${userId} data-course-id=${item.courseId._id} class="remove-cart">Delete</button>
              `;
              cartItemsContainer.appendChild(div);
            }
          });
        });
        // Send request to add course to cart
      } else {
        alert("Please log in to add courses to your cart.");
      }
      if (data.isAdmin) {
        const userId = data.userId;
        if (navItemsContainer) {
          const li = document.createElement("li");
          // li.classList.add("cart-item");
          li.innerHTML = `
            <a href="/admin">Admin</a>
            `;
          navItemsContainer.appendChild(li);
        }
        // Send request to add course to cart
      } 
    })
    .catch((error) => {
      console.log("User not authenticated, staying on login page.");
    });

  const path = window.location.pathname;
  logoutBtn.addEventListener("click", async () => {
    let tokenToSend = csrfToken; // Get current global token

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
    .then((response) => {
      console.log("Logout response status:", response.status);
      console.log("Logout response redirected:", response.redirected);
      console.log("Logout response url:", response.url);

      if (response.status === 403) {
        // Try to parse the JSON body for a more specific error
        return response
          .json()
          .then((data) => {
            throw new Error(
              `Forbidden: ${data.message || "CSRF token validation failed"}`
            );
          })
          .catch(() => {
            // If parsing fails, throw a generic 403 error
            throw new Error(
              "Forbidden (403): CSRF token validation likely failed."
            );
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
        window.location.href = "/"; // Or "/" or "http://localhost:8080/"
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

const cartItemsContainer = document.getElementById("cart-items");

const checkoutbtn = document.getElementById("checkout-btn");

checkoutbtn.addEventListener("click", () => {
  alert("Proceeding to checkout...");
});

async function deleteCourseFromCart(userId, courseId) {
  try {
    const response = await fetch(`${courseBackendUrl}/cart/remove`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, courseId }),
    });

    if (response.ok) {
      console.log("Course removed successfully!");
      event.target.closest(".cart-item").remove(); // Remove from UI
    } else {
      console.log("Error removing course");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}




cartItemsContainer.addEventListener("click", async (event) => {
  if (event.target.classList.contains("remove-cart")) {
    const userId = event.target.dataset.userId;
    const courseId = event.target.dataset.courseId;
    console.log(userId);
    console.log(courseId);
    console.log("Removing:", event.target.closest(".cart-item"));
    event.target.closest(".cart-item").remove(); // Remove the cart item
    await deleteCourseFromCart(userId,courseId);
  }
});
