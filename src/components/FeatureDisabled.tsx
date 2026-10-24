import Header from "~/components/Header";

export function FeatureDisabled(props: { title: string }) {
  return (
    <div class="home-page">
      <Header info={props.title} />
      <main>
        <div class="feature-disabled">
          <h2>{props.title} is disabled</h2>
          <p>
            This feature is waiting until its BDSMLR backend behavior has been
            verified. Self-hosters can enable it with the matching feature flag.
          </p>
        </div>
      </main>
    </div>
  );
}
