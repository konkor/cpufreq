# [konkor.github.io/cpufreq](https://konkor.github.io/cpufreq/) site

The site is based on **Jekyll** framework. It's supported partially by **GitHub Pages** and can a bit enhance a look and do some automation with the building project documentation on top of _MarkDown_ templates.

_See [Jekyll Framework](https://jekyllrb.com/) site for more information..._

## Installation

1. Follow Jekyll's documentation and install the `jekyll` locally to able preview and test changes.
2. Download or clone [cpufreq](https://github.com/konkor/cpufreq) master branch on GitHub.
3. Open terminal inside of the `/docs` folder.
4. Start Jekyll as you would normally (`bundle exec jekyll serve`)
5. Navigate to `http://localhost:4000/cpufreq/` to access the preview. The compiled static project will be able in the _/docs/_site_ folder.

## Structure of the docs project

``` yaml
docs:
  _includes:
    - html template elements
  _layouts:
    - html page layouts
  _sass:
    - css styles
  assets:
    - images
    - other statical site content
  _frontend:
    - UI pages collection
  _installation:
    - installation pages collection
  index.md: - home page
  faq.md: - faq page
  frontend.md: - UI main page
  ...
  _config.yml: - jekyll configuration file
```

## Contributing

Interested in contributing to CPUFREQ Documentation?
1. Add/Update/Create some content and make pull request.
2. Make an [issue](https://github.com/konkor/cpufreq/issues)
3. Become a beta tester on your favorite Linux distribution. _It's very important task to notify about some issues to get early fixes and to avoid other users from same troubles. We have a very small community and can't test it on all available distributions of Linux._
