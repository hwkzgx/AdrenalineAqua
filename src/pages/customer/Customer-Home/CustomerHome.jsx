import "./customer-home.css";
import CustomerNavbar from "../../../components/navbar/CustomerNavbar";
import HeroImage from "../../../assets/HeroImage.png";
import AboutImage from "../../../assets/About-Image.png";
import FooterImage from "../../../assets/FooterImage.png";
import AquaLogo from "../../../assets/AquaLogo.png";
import { useNavigate } from "react-router-dom";

import {
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaFacebookF,
} from "react-icons/fa";

export default function CustomerHome() {

  const navigate = useNavigate();

  return (
    <>
      <CustomerNavbar />

      {/* HERO SECTION */}
      <section className="hero-section">

        <div className="hero-content">

          <h1>Pure Water, Fast Delivery.</h1>

          <h2>“The water that keeps you going.”</h2>

          <p>
            Adrenaline Aqua Water Refilling Station provides clean, safe,
            and affordable drinking water delivered right to your doorstep.
            We ensure fast delivery and quality service for every customer.
          </p>

          <button
            type="button"
            className="order-btn"
            onClick={() => navigate("/customer/customerlogin")}
          >
            Order Now
          </button>

        </div>

      </section>

      {/* SERVICES */}
      <section className="services-section">

        <h1>Our Services</h1>

        <div className="services-container">

          <div className="service-card">
            <h2>Water Refilling</h2>

            <p>
             Clean and purified drinking water for homes and businesses.
            </p>
          </div>

          <div className="service-card">
            <h2>Fast Delivery</h2>

            <p>
             We deliver your orders
quickly and safely right to your doorstep.
            </p>
          </div>

          <div className="service-card">
            <h2>Easy Ordering</h2>

            <p>
             Simple and hassle free ordering process anytime, anywhere.
            </p>
          </div>

          <div className="service-card">
            <h2>Quality Guaranteed</h2>

            <p>
             We ensure the highest quality and safety in every drop.
            </p>
          </div>

        </div>

      </section>

      {/* ABOUT US */}
      <section className="about-section">

        <div className="about-text">

          <h1>About Us</h1>

          <p>
            Aqua Water Refilling Station is committed to providing the
            community with safe, clean, and affordable drinking water.
          </p>

          <p>
            We aim to promote a healthier lifestyle by making clean water
            accessible to everyone.
          </p>

        </div>

        <div className="about-image">
          <img src={AboutImage} alt="About Image" />
        </div>

      </section>

      {/* CONTACT US */}
      <section className="contact-section">

        <h1>Contact Us</h1>

        <div className="contact-container">

          {/* CONTACT FORM */}
          <div className="contact-form">

            <input type="text" placeholder="Full Name" />

            <input type="email" placeholder="Email Address" />

            <input type="text" placeholder="Phone Number" />

            <textarea placeholder="Your Message"></textarea>

            <button>SEND MESSAGE</button>

          </div>

          {/* CONTACT INFO */}
          <div className="contact-info">

            <div className="contact-details">

              <p>
                <FaPhoneAlt className="contact-icon" />
                09705095542 / 09294636127
              </p>

              <p>
                <FaMapMarkerAlt className="contact-icon" />
                Stall #4 MH Del Pilar St.
                San Sebastian Hagonoy, Bulacan
              </p>

              <p>
                <FaEnvelope className="contact-icon" />
                adrenalineaqua@gmail.com
              </p>

              <p>
                <FaFacebookF className="contact-icon" />
                Adrenaline Aqua Water Refilling Station
              </p>

            </div>
 
            {/* GOOGLE MAP */}
            <div className="map-box">

              <iframe
                src="https://www.google.com/maps?q=Stall%20%234%20MH%20Del%20Pilar%20St.%20San%20Sebastian%20Hagonoy%20Bulacan&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
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

          <p>
            Stall #4 MH Del Pilar St.
            San Sebastian Hagonoy, Bulacan
          </p>

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