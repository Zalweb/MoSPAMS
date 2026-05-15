<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $userName,
        public readonly string $otpCode,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify your MoSPAMS email');
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name = e($this->userName);
        $code = e($this->otpCode);

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#18181b;">Verify your email</h2>
            <p style="color:#52525b;margin:0 0 24px;">Hi {$name}, enter this code to verify your MoSPAMS account:</p>
            <div style="text-align:center;margin:0 0 24px;">
              <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:10px;color:#18181b;background:#f4f4f5;padding:16px 24px;border-radius:8px;border:1px solid #e4e4e7;">{$code}</span>
            </div>
            <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">This code expires in <strong>15 minutes</strong>.</p>
            <p style="color:#a1a1aa;font-size:13px;margin:0;">If you did not create a MoSPAMS account, you can ignore this email.</p>
            <hr style="border:none;border-top:1px solid #f4f4f5;margin:24px 0;">
            <p style="color:#d4d4d8;font-size:11px;margin:0;">MoSPAMS &mdash; Motorcycle Service &amp; Parts Management</p>
          </div>
        </body>
        </html>
        HTML;
    }
}
