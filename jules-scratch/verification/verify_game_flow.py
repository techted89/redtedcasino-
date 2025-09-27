from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the login page
        # Since the server is running on port 3000 and serving static files,
        # we can navigate directly to the login page.
        page.goto("http://localhost:3000/index.html")

        # 2. Perform login
        page.locator("#username").fill("testuser")
        page.locator("#password").fill("password123")
        page.locator("button[type='submit']").click()

        # 3. Wait for the game selection scene to load in game.html
        # The URL should change, and we should see the game list.
        expect(page).to_have_url("http://localhost:3000/game.html", timeout=10000)

        # In Phaser, elements are on a canvas, so we can't use standard DOM locators.
        # Instead, we'll wait for the canvas to be present and then click a game by text.
        # For simplicity, we'll assume the first game is the one we want.
        # A more robust solution might involve listening for game events or using visual regression.
        game_choice = page.get_by_text("Bear Slot")
        expect(game_choice).to_be_visible()
        game_choice.click()

        # 4. Wait for the slot machine scene to load
        # We'll look for the spin button to confirm the scene is ready.
        spin_button = page.get_by_text("SPIN")
        expect(spin_button).to_be_visible(timeout=5000)

        # 5. Click the spin button
        spin_button.click()

        # 6. Wait for the win animation/text to appear
        # The mocked backend guarantees a win.
        win_text = page.get_by_text("YOU WON:", timeout=10000)
        expect(win_text).to_be_visible()

        # 7. Take a screenshot of the final win state
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot captured successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        # Save a screenshot on error for debugging
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)