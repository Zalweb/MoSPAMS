<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your MoSPAMS password was changed');
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name = e($this->userName);

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">Password changed</h2>
            <p style="color:#52525b;margin:0 0 16px;">Hi {$name}, your MoSPAMS password was successfully changed.</p>
            <p style="color:#52525b;margin:0 0 24px;">If you did not make this change, contact support immediately at <a href="mailto:support@mospams.shop" style="color:#18181b;">support@mospams.shop</a>.</p>
            <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;">
            <p style="color:#d4d4d8;font-size:11px;margin:0;">MoSPAMS &mdash; Motorcycle Service &amp; Parts Management</p>
          </div>
        </body>
        </html>
        HTML;
    }
}
