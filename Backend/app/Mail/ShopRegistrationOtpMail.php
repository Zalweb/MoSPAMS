<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShopRegistrationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $ownerName,
        public readonly string $otpCode,
        public readonly string $shopName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your MoSPAMS shop registration');
    }

    public function content(): Content
    {
        $html = <<<HTML
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#09090b;color:#fafafa;margin:0;padding:40px 20px;">
          <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:16px;padding:40px;border:1px solid #27272a;">
            <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;">MoSPAMS</h1>
            <p style="color:#a1a1aa;margin:0 0 32px;">Motorcycle Service &amp; Parts Management</p>
            <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;">Verify your shop registration</h2>
            <p style="color:#a1a1aa;margin:0 0 24px;">Hi {$this->ownerName}, enter this code to activate your <strong style="color:#fafafa;">{$this->shopName}</strong> shop and start your free trial:</p>
            <div style="background:#09090b;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;border:1px solid #27272a;">
              <span style="font-size:40px;font-weight:700;letter-spacing:12px;font-family:monospace;">{$this->otpCode}</span>
            </div>
            <p style="color:#71717a;font-size:13px;margin:0;">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
        HTML;

        return new Content(htmlString: $html);
    }
}
