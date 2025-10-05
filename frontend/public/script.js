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

const navItemsContainer = document.getElementById("nav-items");

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
  const res = await fetch("http://localhost:5001/courses");
  const courseSample = await res.json();
  renderCourseList(courseSample);
  if (path === "/dashboard") {
    console.log("Dashboard page");
    // const welcomeMessage = document.getElementById("welcomeMessage");
    const logoutBtn = document.getElementById("logoutBtn");
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get("from") === "";

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
          window.location.href = "/?from=dashboard";
        }
      });







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

document
  .getElementById("explore-courses")
  .addEventListener("click", async () => {
    const res = await fetch("http://localhost:5001/courses");
    const courseSample = await res.json();
    renderCourseList(courseSample);
  });

function createCourseCard(course) {
  return `
        <div class="course-card">
                <h3>${course.name}</h3>
                <p>Professional Certificate</p>
                <p style="color: gold">$ ${course.price}</p>
                <button data-id=${course._id} class="details">Details</button>
            </div>
    `;
}

const courseContainer = document.getElementById("course-list");

function renderCourseList(courses) {
  const courseListElement = document.getElementById("course-list");
  courseListElement.innerHTML = courses.map(createCourseCard).join("");
}

const modal = document.getElementById("courseModal");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalPrice = document.getElementById("modal-price");
const modalAddBtn = document.getElementById("modal-addBtn");
const closeModal = document.querySelector(".close");

courseContainer.addEventListener("click", (event) => {
  if (event.target.classList.contains("details")) {
    const courseCard = event.target.closest(".course-card");
    const courseId = event.target.dataset.id;
    const courseName = courseCard.querySelector("h3").textContent;
    const coursePrice = courseCard.querySelector(
      "p[style='color: gold']"
    ).textContent;
    const courseDescription = "This is a detailed description of the course."; // Replace with actual description if available

    // Populate modal with course details
    modalTitle.textContent = courseName;
    modalDescription.textContent = courseDescription;
    modalPrice.textContent = coursePrice;
    modal.style.display = "flex";

    // Set up add-to-cart functionality inside modal
    //modalAddBtn.onclick = () => addToCart(courseId);

    modalAddBtn.addEventListener("click", (event) => {
      if (event.target.classList.contains("addBtn")) {
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
              const userId = data.userId;

              // Send request to add course to cart
              fetch(`${courseBackendUrl}/cart/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, courseId }),
              })
                .then((res) => res.json())
                .then((response) => {
                  console.log("Added to cart:", response);
                  showToast("Course added to cart successfully!");
                  modal.style.display = "none"; // Close modal after adding
                })

                .catch((error) =>
                  console.error("Error adding course to cart:", error)
                );
            } else {
              alert("Please log in to add courses to your cart.");
            }
          })
          .catch((error) => {
            console.log("User not authenticated, staying on login page.");
          });
      }
    });
  }
});

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000); // Hide after 3 seconds
}

// Close modal when clicking 'X' or outside modal
closeModal.onclick = () => (modal.style.display = "none");
window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

// Function to add course to cart
function addToCart(courseId) {
  fetch(`${courseBackendUrl}/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "currentUserId", courseId }),
  })
    .then((res) => res.json())
    .then((response) => {
      console.log("Added to cart:", response);
      alert("Course added to cart successfully!");
      modal.style.display = "none"; // Close modal after adding
    })
    .catch((error) => console.error("Error adding course to cart:", error));
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("courseModal");
  const closeModal = document.querySelector(".close");

  // Ensure modal is hidden on initial load
  modal.style.display = "none";

  closeModal.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
});
