# Ahmed Shawky Ahmed — Engineering Portfolio (V1)

A responsive, static HTML/CSS/JavaScript portfolio designed for free publishing with GitHub Pages.

## Files

- `index.html` — all page content and sections
- `css/style.css` — layout, colours, responsive design, and temporary project artwork
- `js/main.js` — mobile navigation and current year
- `assets/images/` — add approved project images here as you prepare them

## Publish with GitHub Pages

1. Sign in to GitHub.
2. Create a **public** repository named exactly `YOUR-GITHUB-USERNAME.github.io`.
3. Upload the contents of this folder (upload `index.html`, `css`, `js`, and `assets` — not just the ZIP).
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`, then save.
7. Wait for GitHub Pages to publish the site. Your address will be `https://YOUR-GITHUB-USERNAME.github.io/`.

## Before publishing

- Confirm your email address and LinkedIn URL.
- Review every career detail and project description for accuracy and confidentiality.
- Replace the temporary CSS project illustrations with your own approved CAD renders, photographs, drawings, and simulation screenshots.
- Add a downloadable CV only after placing an approved PDF in the project and adding its link.
- Do not upload confidential employer drawings, customer data, patent-sensitive details, or restricted simulation results.

## Updating project visuals

Put image files in `assets/images/`. For example, to add a project image, replace the relevant `.project-art` block in `index.html` with:

```html
<div class="project-art">
  <img src="assets/images/spa-cooling-system.jpg" alt="Spa cooling system CAD assembly">
</div>
```

Then add this CSS rule to `css/style.css`:

```css
.project-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

## Notes

- The website uses Google Fonts as an optional external font source. The site still works if fonts cannot load.
- No paid hosting, subscription, database, or backend is required.
- The first version intentionally uses abstract CSS illustrations rather than pretending to show your actual engineering models or analysis results.
