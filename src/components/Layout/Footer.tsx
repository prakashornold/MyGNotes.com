import './Footer.css';

/**
 * Footer Component - Single line centered
 * Developed by Om Prakash Peddamadthala
 */
export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-container">
                <p className="footer-text">
                    © {currentYear} MyGNotes.com. All rights reserved. — Developed with ❤️ by <strong>Om Prakash Peddamadthala</strong>
                </p>
            </div>
        </footer>
    );
}

export default Footer;
