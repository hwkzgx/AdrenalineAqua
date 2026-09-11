import "./customer-contacts.css";
import CustomerNavbar from "../../../components/NavBar/CustomerNavbar";
import AquaLogo from "../../../assets/AquaLogo.png";

import {
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaFacebookF,
} from "react-icons/fa";

export default function CustomerContacts() {

  return (
    <>
      <CustomerNavbar />

      {/* HERO */}
      <section className="contact-hero">

        <div className="contact-hero-text">

          <h1>Contact Us</h1>

          <p>
           We’re here to help! Whether you have a question, need more information, 
           or want to place an order, feel free to reach out to us.
          </p>
          <p>
            Your satisfaction is our priority.
          </p>

        </div>

      </section>

      {/* CONTACT SECTION */}
      <section className="contact-page-section">

        <div className="contact-page-container">

          {/* FORM */}
          <div className="contact-form-card">

            <h2>Send Us a Message</h2>

            <input type="text" placeholder="Full Name" />
            <input type="email" placeholder="Email Address" />
            <input type="text" placeholder="Phone Number" />
            <textarea placeholder="Your Message"></textarea>

            <button>Send Message</button>

          </div>

          {/* INFO */}
<div className="contact-info-card">

  {/* NEW WRAPPER START */}
  <div className="contact-details-content">
    <h2>Contact Information</h2>

    <div className="info-item">
      <FaPhoneAlt />
      <p>09705095542 / 09294636127</p>
    </div>

    <div className="info-item">
      <FaMapMarkerAlt />
      <p>Stall #4 MH Del Pilar St. San Sebastian Hagonoy, Bulacan</p>
    </div>

    <div className="info-item">
      <FaEnvelope />
      <p>adrenalineaqua@gmail.com</p>
    </div>

    <div className="info-item">
      <FaFacebookF />
      <p>Adrenaline Aqua Water Refilling Station</p>
    </div>
  </div>
 

  {/* MAP */}
  <div className="contact-map-box">
    <iframe
      src="https://www.google.com/maps?q=Stall%20%234%20MH%20Del%20Pilar%20St.%20San%20Sebastian%20Hagonoy%20Bulacan&output=embed" 
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      title="Google Map"
    ></iframe>
  </div>

</div>

        </div>

      </section>

      {/* FOOTER */}
      <footer className="footer">

        <div className="footer-logo">

          <img src={AquaLogo} alt="Aqua Logo" />

          <h2>Adrenaline Aqua</h2>

          <p>“The water that keeps you going.”</p>

        </div>

        <div className="footer-contact">

          <h3>Contact Info</h3>

          <p>09705095542 / 09294636127</p>

          <p>adrenalineaqua@gmail.com</p>

          <p>Stall #4 MH Del Pilar St. San Sebastian Hagonoy, Bulacan</p>

        </div>

        <div className="footer-socials">

          <h3>Follow us</h3>

          <p>Facebook</p>

          <p>Messenger</p>

        </div>

      </footer>

    </>
  );
}