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

fetchCsrfToken().then(() => {
  console.log("CSRF token initialization complete");
});


const navItemsContainer = document.getElementById("nav-items");


document.addEventListener("DOMContentLoaded", async () => {

  const path = window.location.pathname;
  const res = await fetch("http://localhost:5001/courses");
  const courseSample = await res.json();
  courseSample.forEach(item => {
    console.log(item);
    if(enrolledCoursesContainer){
      const div = document.createElement("div");
    div.classList.add("course-card");
    div.innerHTML = `
        <h3>${item.name}</h3>
        <p>$ ${item.price}</p>
        <p class="description">${item.description}</p>
        <button data-id=${item._id} class="edit-btn">Edit</button>
        <button data-id=${item._id} class="delete-btn">Delete</button>
    `;
    enrolledCoursesContainer.appendChild(div);
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
      if (!data.authenticated || !data.isAdmin) {
        window.location.href = "/"; // Redirect to homepage
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

const enrolledCoursesContainer = document.getElementById("enrolled-courses");

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
           window.location.href = '/'; // Or "/" or "http://localhost:8080/"
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

document.addEventListener("DOMContentLoaded", () => {
  const addCourseForm = document.getElementById("add-course-form");

  addCourseForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const courseName = document.getElementById("course-name").value;
      const coursePrice = document.getElementById("course-price").value;
      const courseDescription = document.getElementById("course-description").value;

      const response = await fetch("http://localhost:5001/courses", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: courseName, price: coursePrice, description: courseDescription }),
          credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
          alert("Course added successfully!");
          location.reload(); // Reload to show updated course list
      } else {
          alert("Error adding course.");
      }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const enrolledCoursesContainer = document.getElementById("enrolled-courses");

  enrolledCoursesContainer.addEventListener("click", async (event) => {
      if (event.target.classList.contains("delete-btn")) {
          const courseId = event.target.dataset.id;

          const confirmDelete = confirm("Are you sure you want to delete this course?");
          if (!confirmDelete) return;

          try {
              const response = await fetch(`http://localhost:5001/courses/${courseId}`, {
                  method: "DELETE",
                  headers: {
                      "Content-Type": "application/json",
                  },
              });

              if (response.ok) {
                  alert("Course deleted successfully!");
                  event.target.closest(".course-card").remove(); // Remove course from UI
              } else {
                  alert("Error deleting course.");
              }
          } catch (error) {
              console.error("Error:", error);
              alert("An error occurred while deleting the course.");
          }
      }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const enrolledCoursesContainer = document.getElementById("enrolled-courses");
  const editCourseForm = document.getElementById("edit-course-form");
  const editCourseSection = document.querySelector(".edit-course");
  const editCourseId = document.getElementById("edit-course-id");
  const editCourseName = document.getElementById("edit-course-name");
  const editCoursePrice = document.getElementById("edit-course-price");
  const editCourseDescription = document.getElementById("edit-course-description");
  const cancelEditBtn = document.getElementById("cancel-edit");

  // Event listener to handle Edit button click
  enrolledCoursesContainer.addEventListener("click", (event) => {
      if (event.target.classList.contains("edit-btn")) {
          const courseCard = event.target.closest(".course-card");
          const courseId = event.target.dataset.id;
          const courseName = courseCard.querySelector("h3").innerText;
          const coursePrice = courseCard.querySelector("p").innerText.replace("$", "").trim();
          const courseDescription = courseCard.querySelector(".description").innerText;

          // Fill form fields with current course data
          editCourseId.value = courseId;
          editCourseName.value = courseName;
          editCoursePrice.value = coursePrice;
          editCourseDescription.value = courseDescription;

          // Show the edit form
          editCourseSection.style.display = "block";
      }
  });

  // Event listener to handle Edit form submission
  editCourseForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const updatedCourse = {
          name: editCourseName.value,
          price: editCoursePrice.value,
          description: editCourseDescription.value,
      };

      try {
          const response = await fetch(`http://localhost:5001/courses/${editCourseId.value}`, {
              method: "PUT",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify(updatedCourse),
          });

          if (response.ok) {
              alert("Course updated successfully!");
              location.reload(); // Reload the page to reflect changes
          } else {
              alert("Error updating course.");
          }
      } catch (error) {
          console.error("Error:", error);
          alert("An error occurred while updating the course.");
      }
  });

  // Cancel Edit - Hide the form
  cancelEditBtn.addEventListener("click", () => {
      editCourseSection.style.display = "none";
  });
});
