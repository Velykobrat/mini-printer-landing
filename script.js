const orderForm = document.getElementById("order-form");
const formStatus = document.getElementById("form-status");

if (orderForm && formStatus) {
  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = orderForm.querySelector('button[type="submit"]');
    const formData = new FormData(orderForm);
    const data = Object.fromEntries(formData.entries());

    submitButton.disabled = true;
    submitButton.textContent = "Надсилаємо...";

    formStatus.textContent = "";
    formStatus.className = "form-status";

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не вдалося надіслати замовлення.");
      }

      formStatus.textContent =
        "Дякуємо! Замовлення прийнято. Ми зв'яжемося з вами найближчим часом.";

      formStatus.classList.add("form-status--success");

      orderForm.reset();
    } catch (error) {
      formStatus.textContent =
        error.message || "Сталася помилка. Спробуйте ще раз.";

      formStatus.classList.add("form-status--error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Замовити за 800 грн";
    }
  });
}

const mobileOrder = document.querySelector('.mobile-order');
const orderSection = document.getElementById('order');
if (mobileOrder && orderSection && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    mobileOrder.classList.toggle('is-hidden', entry.isIntersecting);
  }, { threshold: 0 }).observe(orderSection);
}

