import React from "react"

import Layout from "../components/layout"
import SEO from "../components/seo"
import Join from "../components/join"

const IndexPage = ({ location }) => (
  <Layout>
    <SEO title="Home" />
    <Join location={location}/>
  </Layout>
)

export default IndexPage
