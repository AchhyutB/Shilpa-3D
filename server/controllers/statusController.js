export const getStatus = async (req, res) => {
  const { session_id } = req.params;

  try {
    const response = await fetch(
      `${process.env.PIPELINE_URL}/jobs/${session_id}/status`,
      {
        headers: { "ngrok-skip-browser-warning": "true" },
      },
    );
    if (response.status === 404) {
      return res.status(200).json({ stage: "not_started", percent: 0 });
    }

    if (!response.ok) {
      return res.status(502).json({ message: "Pipeline server error" });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(200).json({ stage: "not_started", percent: 0 });
  }
};
