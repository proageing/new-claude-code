"""
One-time setup script — discovers your BC Company ID and prints it.
Run this once after filling in your .env to get the BC_COMPANY_ID value.

Usage:
    python setup.py
"""

from dotenv import load_dotenv
load_dotenv()

import bc_client

if __name__ == "__main__":
    print("Fetching Business Central companies...\n")
    companies = bc_client.list_companies()
    for c in companies:
        print(f"  Name: {c['name']}")
        print(f"  ID:   {c['id']}")
        print()
    print("Copy the ID above into BC_COMPANY_ID in your .env file.")
