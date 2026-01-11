from composio import Composio
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))

auth_config_id = "ac_JiFqwXAD-Wmj"# TODO

user_id = str(uuid.uuid4())

connection_request = composio.connected_accounts.link(auth_config_id=auth_config_id, user_id=user_id, callback_url="http://www.google.com")

print("redirect url: ", connection_request.redirect_url)

connected_account = connection_request.wait_for_connection()

print("connected account: ", connected_account)

result = composio.tools.execute(
    user_id=user_id, 
    slug="GMAIL_SEND_EMAIL", 
    arguments={
        "to": "antonk1@uci.edu",
        "subject": "Hello from Composio",
        "body": "This is a test email sent via Composio Gmail integration.",
        "is_html": False,
    },
    dangerously_skip_version_check=True)

print("result: ", result)