/**
 * @file The site footer: wordmark, social links, and a copyright line.
 *
 * Static and presentational — no props, no state, no data. Rendered once by App
 * below the routed page.
 *
 * TODO(doc): the social links point at the platforms' bare homepages
 * (facebook.com, instagram.com, ...) rather than any specific account, and the
 * "Home / Works / About / Blog / Contact" items are plain <p> elements that do
 * nothing when clicked. Whether these are placeholders awaiting real content or
 * intentionally decorative is not something the code reveals.
 */

import "../styles/components/Footer.css";
import facebook from "../assets/images/facebook.png";
import instagram from "../assets/images/instagram.png";
import linkedin from "../assets/images/linkedin.png";
import youtube from "../assets/images/youtube.png";
import github from "../assets/images/github.png";
import logo_slogan from "../assets/images/logo_slogan.png";

/** The site footer. Takes no props. */
const Footer = () => {
  // Read at render, not at module load — a long-lived tab would otherwise show
  // the year the bundle was first evaluated.
  const year = new Date().getFullYear();

  return (
    <div className="footer">
      <div className="footer-major1">
        <div className="footer-minor1">
          <img className="logo-slogan" src={logo_slogan} alt="logo image" />
        </div>
        <div className="footer-minor2">
          <div className="footer-minor21">
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img className="logoimage" src={facebook} alt="facebook icon" />
            </a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img className="logoimage" src={instagram} alt="instagram icon" />
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img className="logoimage" src={linkedin} alt="linkedin icon" />
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer">
              <img className="logoimage" src={youtube} alt="youtube icon" />
            </a>
            <a href="https://www.github.com/" target="_blank" rel="noreferrer">
              <img className="logoimage" src={github} alt="github icon" />
            </a>
          </div>
          <div className="footer-minor21">
            <p>Home</p>
            <p>Works</p>
            <p>About</p>
            <p>Blog</p>
            <p>Contact</p>
          </div>
        </div>
      </div>
      <div className="footer-major2">
        <p>Copyright {year}, All Rights Reserved.</p>
      </div>
    </div>
  );
};

export default Footer;
