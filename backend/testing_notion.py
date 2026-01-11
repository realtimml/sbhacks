from composio import Composio

from dotenv import load_dotenv
import os
load_dotenv()
# Initialize Composio client
composio = Composio(api_key=os.getenv("COMPOSIO_API_KEY"))

DATABASE_ID = "2e59fd61a0128028ab15e5c03531bb72"

def sanity_check_notion():
    print("🔍 Step 1: Checking Notion identity...")

    print("\n🔍 Step 2: Checking database access...")
    res = composio.tools.execute(
        slug="NOTION_FETCH_DATABASE",
        arguments={
            "database_id": DATABASE_ID
        }
    )

    title = res["title"][0]["plain_text"]
    print(f"✅ Database accessible: {title}")

    print("\n🧪 Step 3: Testing write access...")
    res = composio.tools.execute(
        slug="NOTION_INSERT_ROW_DATABASE",
        arguments={
            "parent": {
                "database_id": DATABASE_ID
            },
            "properties": {
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": "Sanity Check Task (Composio Python)"
                            }
                        }
                    ]
                }
            }
        }
    )

    print("✅ Write access confirmed. Page ID:", res["id"])
    print("\n🎉 Composio Notion sanity check PASSED.")


if __name__ == "__main__":
    sanity_check_notion()
