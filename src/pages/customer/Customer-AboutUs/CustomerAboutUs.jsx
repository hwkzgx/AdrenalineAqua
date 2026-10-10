import "./customer-aboutus.css";
import CustomerNavbar from "../../../components/NavBar/CustomerNavbar";
import AquaLogo from "../../../assets/AquaLogo.png";

import Director1 from "../../../assets/Directors/director1.png";
import Director2 from "../../../assets/Directors/director2.png";
import Director3 from "../../../assets/Directors/director3.png";
import Director4 from "../../../assets/Directors/director4.png";

export default function CustomerAboutUs() {
  return (
    <>
      <CustomerNavbar />

      {/* ABOUT HERO */}
      <section className="about-hero">

        <div className="about-content">

          <div className="about-text">

            <h1>About Us</h1>

            <p>
              We provide safe, clean, and high-quality purified drinking water
              for your everyday needs. From our filtration process to our
              containers, we ensure every drop meets the highest standards.
            </p>

            <p>
              Trusted by professionals and health-conscious customers,
              Adrenaline Aqua is committed to delivering reliable service
              and the best customer experience.
            </p>

          </div>

        </div>

      </section>

      {/* DIRECTORS */}
      <section className="directors-section">

        <h1>Meet Our Directors</h1>

        <div className="directors-container">

          <div className="director-card">
            <img src={Director1} alt="Director 1" />
            <h2>Mike Ancheta</h2>
            <p>CEO / Operations Director</p>
          </div>

          <div className="director-card">
            <img src={Director2} alt="Director 2" />
            <h2>Archie Alviz</h2>
            <p>Quality Assurance Director</p>
          </div>

          <div className="director-card">
            <img src={Director3} alt="Director 3" />
            <h2>Hannah Alviz</h2>
            <p>Marketing Director</p>
          </div>

          <div className="director-card">
            <img src={Director4} alt="Director 4" />
            <h2>Jan Elyzza Ancheta</h2>
            <p>Accounting Director</p>
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
            <br />
            San Sebastian, Hagonoy, Bulacan
          </p>

        </div>

        <div className="footer-socials">

          <h3>Follow us</h3>

          <p>Facebook: Adrenaline Aqua Water Refilling Station</p>

          <p>Messenger: Adrenaline Aqua Water Refilling Station</p>

        </div>

      </footer>
    </>
  );
}