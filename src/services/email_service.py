import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@novus.com")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """Send password reset email"""
        try:
            # Create reset link
            reset_link = f"{self.frontend_url}/reset-password?token={reset_token}"

            # Create email content
            subject = "Recuperación de Contraseña - AI Platform Novus"
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #4F46E5;">Recuperación de Contraseña</h2>
                        <p>Has solicitado restablecer tu contraseña para AI Platform Novus.</p>
                        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                        <p style="margin: 30px 0;">
                            <a href="{reset_link}"
                               style="background-color: #4F46E5; color: white; padding: 12px 24px;
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Restablecer Contraseña
                            </a>
                        </p>
                        <p>O copia y pega el siguiente enlace en tu navegador:</p>
                        <p style="word-break: break-all; color: #666;">
                            {reset_link}
                        </p>
                        <p style="margin-top: 30px; color: #666; font-size: 14px;">
                            Este enlace expirará en 1 hora.
                        </p>
                        <p style="color: #666; font-size: 14px;">
                            Si no solicitaste este cambio, puedes ignorar este correo.
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #999; font-size: 12px;">
                            Este es un correo automático, por favor no respondas a este mensaje.
                        </p>
                    </div>
                </body>
            </html>
            """

            # Send email
            return self._send_email(to_email, subject, html_body)

        except Exception as e:
            print(f"Error sending password reset email: {str(e)}")
            return False

    def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Internal method to send email via SMTP"""
        try:
            # Check if SMTP is configured
            if not self.smtp_username or not self.smtp_password:
                print("SMTP not configured. Email not sent.")
                print(f"Password reset link would be: {self.frontend_url}/reset-password?token=...")
                return True  # Return True in dev to not block the flow

            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email

            # Add HTML body
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)

            print(f"✓ Password reset email sent to {to_email}")
            return True

        except Exception as e:
            print(f"✗ Error sending email: {str(e)}")
            # In development, print the link
            if "localhost" in self.frontend_url:
                print(f"Development mode: Reset link would be sent to {to_email}")
            return False
