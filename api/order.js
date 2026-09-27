export default async function handler(req, res) {

  /*
   * Only allow POST requests.
   */

  if (req.method !== "POST") {

    return res.status(405).json({
      message: "Method not allowed"
    });

  }


  try {

    const {
      network,
      bundle,
      price,
      validity,
      phone
    } = req.body || {};


    /*
     * Basic validation
     */

    const allowedNetworks = [
      "mtn",
      "telecel",
      "airteltigo"
    ];


    if (!allowedNetworks.includes(network)) {

      return res.status(400).json({
        message: "Invalid network."
      });

    }


    if (!bundle || !phone) {

      return res.status(400).json({
        message:
          "Bundle and phone number are required."
      });

    }


    /*
     * Ghana phone validation
     */

    const cleanPhone =
      String(phone).replace(/\s+/g, "");


    if (
      !/^0(2[0567]|5[0-9])\d{7}$/.test(
        cleanPhone
      )
    ) {

      return res.status(400).json({
        message:
          "Invalid Ghana phone number."
      });

    }


    /*
     * IMPORTANT SECURITY RULE
     *
     * NEVER trust the price sent by the
     * browser.
     *
     * The backend should obtain the real
     * price from your own database/API.
     */

    /*
     * --------------------------------------
     * YOUR DATA PROVIDER API
     * --------------------------------------
     *
     * Add these as server environment
     * variables:
     *
     * DATA_API_URL
     * DATA_API_KEY
     *
     * Example:
     *
     * DATA_API_URL=https://your-provider.com/api
     * DATA_API_KEY=xxxxxxxx
     */


    const DATA_API_URL =
      process.env.DATA_API_URL;


    const DATA_API_KEY =
      process.env.DATA_API_KEY;


    if (
      !DATA_API_URL ||
      !DATA_API_KEY
    ) {

      return res.status(500).json({
        message:
          "Data API is not configured yet."
      });

    }


    /*
     * Generate an idempotency/reference ID.
     *
     * In production, use a database-backed
     * order ID instead.
     */

    const requestId =
      "KD_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2, 8);


    /*
     * --------------------------------------
     * IMPORTANT
     * --------------------------------------
     *
     * The exact endpoint/body depends on
     * your data provider.
     *
     * Replace /orders with the endpoint
     * specified by YOUR API provider.
     */

    const apiResponse =
      await fetch(
        `${DATA_API_URL}/orders`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${DATA_API_KEY}`,

            "X-Idempotency-Key":
              requestId
          },

          body: JSON.stringify({

            network: network,

            bundle: bundle,

            phone: cleanPhone,

            request_id: requestId

          })

        }
      );


    const apiData =
      await apiResponse.json();


    if (!apiResponse.ok) {

      return res.status(
        apiResponse.status
      ).json({

        message:
          apiData.message ||
          "Data provider rejected the order.",

        provider:
          apiData

      });

    }


    /*
     * --------------------------------------
     * PAYMENT
     * --------------------------------------
     *
     * This is where your payment provider
     * should be called.
     *
     * Do NOT mark the order as paid here
     * unless the payment provider confirms
     * payment.
     *
     * Example result expected:
     *
     * paymentUrl:
     * "https://payment-provider/checkout/..."
     *
     */


    return res.status(201).json({

      success: true,

      reference:
        requestId,

      network:
        network,

      bundle:
        bundle,

      phone:
        cleanPhone,

      validity:
        validity,

      /*
       * Replace this with your real
       * payment checkout URL.
       */
      paymentUrl:
        null,

      providerOrder:
        apiData

    });


  } catch (error) {

    console.error(
      "KingDATA order error:",
      error
    );


    return res.status(500).json({

      message:
        "Server error. Please try again."

    });

  }

}