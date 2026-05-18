from __future__ import annotations

BUDGET_TOKENS   = 20_000
CHARS_PER_TOKEN = 4  # conservative approximation (no tiktoken dependency)


def _estimate(messages: list[dict]) -> int:
    return sum(len(m.get("content") or "") for m in messages) // CHARS_PER_TOKEN


def maybe_trim(messages: list[dict], provider, system_prompt: str) -> list[dict]:
    """
    When accumulated context exceeds BUDGET_TOKENS, summarize the oldest half
    via the LLM and replace it with a single summary system message.
    """
    if _estimate(messages) <= BUDGET_TOKENS:
        return messages

    split    = len(messages) // 2
    old_half = messages[:split]
    new_half = messages[split:]

    summary_prompt = [
        {
            "role": "system",
            "content": "Summarize the following conversation in 3-5 bullet points, preserving key facts the user mentioned.",
        },
        *old_half,
    ]
    summary_response = provider.chat(summary_prompt, tools=None)
    summary_text     = summary_response.content or "(summary unavailable)"

    return [{"role": "system", "content": f"[Earlier conversation summary]\n{summary_text}"}] + new_half
