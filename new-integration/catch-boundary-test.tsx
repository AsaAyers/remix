import * as React from "react";
import { unstable_createRemixStub as createRemixStub } from "@remix-run/testing";
import { json } from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useLoaderData,
  useMatches,
  useRouteError,
} from "@remix-run/react";
import userEvent from "@testing-library/user-event";

import { render, screen, waitFor } from "./render";

describe("CatchBoundary", () => {
  let ROOT_BOUNDARY_TEXT = "ROOT_TEXT" as const;
  let OWN_BOUNDARY_TEXT = "OWN_BOUNDARY_TEXT" as const;

  let HAS_BOUNDARY_LOADER = "/yes/loader" as const;
  let HAS_BOUNDARY_ACTION = "/yes/action" as const;
  let NO_BOUNDARY_ACTION = "/no/action" as const;
  let NO_BOUNDARY_LOADER = "/no/loader" as const;

  let NOT_FOUND_HREF = "/not/found" as const;

  let ROOT_BOUNDARY_ID = "root-boundary" as const;
  let MATCHES_ID = "matches" as const;

  let OWN_BOUNDARY_ID = "boundary-loader" as const;
  let STATUS_ID = "status" as const;

  let ACTION_BOUNDARY_ID = "action-boundary" as const;

  let PARENT_DATA_ID = "parent-data" as const;
  let CHILD_DATA_ID = "child-data" as const;
  let CHILD_CATCH_ID = "child-catch" as const;

  function RootCatchBoundary() {
    let matches = useMatches();
    return (
      <html>
        <head />
        <body>
          <div data-testid={ROOT_BOUNDARY_ID}>{ROOT_BOUNDARY_TEXT}</div>
          <pre data-testid={MATCHES_ID}>{JSON.stringify(matches)}</pre>
          <Scripts />
        </body>
      </html>
    );
  }

  function HAS_BOUNDARY_LOADER_ERROR_ELEMENT() {
    let error = useRouteError();

    return (
      <>
        <div data-testid={OWN_BOUNDARY_ID}>{OWN_BOUNDARY_TEXT}</div>
        <pre data-testid={STATUS_ID}>
          {isRouteErrorResponse(error) ? error.status : ""}
        </pre>
      </>
    );
  }

  function ACTIONS_CHILD_CATCH_ERROR_ELEMENT() {
    let error = useRouteError();
    let caught = isRouteErrorResponse(error) ? error : undefined;

    return (
      <p data-testid={CHILD_CATCH_ID}>
        {caught?.status} {caught?.data}
      </p>
    );
  }

  function ACTION_ELEMENT() {
    let data = useLoaderData();
    return (
      <div>
        <p data-testid={PARENT_DATA_ID}>{data}</p>
        <Outlet />
      </div>
    );
  }

  function CHILD_ACTION_ELEMENT() {
    let data = useLoaderData();
    return (
      <>
        <p data-testid={CHILD_DATA_ID}>{data}</p>
        <Form method="post" reloadDocument={true}>
          <button type="submit" name="key" value="value">
            Submit
          </button>
        </Form>
      </>
    );
  }

  let RemixStub = createRemixStub([
    {
      path: "/",
      id: "root",
      loader: () => json({ data: "ROOT LOADER" }),
      errorElement: <RootCatchBoundary />,
      element: (
        <html lang="en">
          <head>
            <Meta />
            <Links />
          </head>
          <body>
            <Outlet />
            <Scripts />
            <LiveReload />
          </body>
        </html>
      ),
      children: [
        {
          index: true,
          element: (
            <div>
              <Link to={NOT_FOUND_HREF} data-testid={NOT_FOUND_HREF}>
                {NOT_FOUND_HREF}
              </Link>

              <Form method="post">
                <button
                  formAction={HAS_BOUNDARY_ACTION}
                  data-testid={HAS_BOUNDARY_ACTION}
                  type="submit"
                >
                  {HAS_BOUNDARY_ACTION}
                </button>
                <button
                  formAction={NO_BOUNDARY_ACTION}
                  data-testid={NO_BOUNDARY_ACTION}
                  type="submit"
                >
                  {NO_BOUNDARY_ACTION}
                </button>
              </Form>

              <Link data-testid={HAS_BOUNDARY_LOADER} to={HAS_BOUNDARY_LOADER}>
                {HAS_BOUNDARY_LOADER}
              </Link>
              <Link
                data-testid={`${HAS_BOUNDARY_LOADER}/child`}
                to={`${HAS_BOUNDARY_LOADER}/child`}
              >
                {HAS_BOUNDARY_LOADER}/child
              </Link>
              <Link data-testid={NO_BOUNDARY_LOADER} to={NO_BOUNDARY_LOADER}>
                {NO_BOUNDARY_LOADER}
              </Link>
            </div>
          ),
        },
        {
          path: HAS_BOUNDARY_ACTION,
          action: () => {
            throw new Response("", { status: 401 });
          },
          errorElement: (
            <p data-testid={ACTION_BOUNDARY_ID}>{OWN_BOUNDARY_TEXT}</p>
          ),
          element: (
            <Form method="post">
              <button
                type="submit"
                formAction={HAS_BOUNDARY_ACTION}
                data-testid={HAS_BOUNDARY_ACTION}
              >
                Go
              </button>
            </Form>
          ),
        },
        {
          path: NO_BOUNDARY_ACTION,
          action: () => {
            throw new Response("", { status: 401 });
          },
          element: (
            <Form method="post">
              <button
                type="submit"
                formAction={NO_BOUNDARY_ACTION}
                data-testid={NO_BOUNDARY_ACTION}
              >
                Go
              </button>
            </Form>
          ),
        },
        {
          path: HAS_BOUNDARY_LOADER,
          loader: () => {
            throw new Response("", { status: 401 });
          },
          errorElement: <HAS_BOUNDARY_LOADER_ERROR_ELEMENT />,
          element: <div />,
          children: [
            {
              path: `${HAS_BOUNDARY_LOADER}/child`,
              loader: () => {
                throw new Response("", { status: 404 });
              },
              element: <div />,
            },
          ],
        },
        {
          path: NO_BOUNDARY_LOADER,
          loader: () => {
            throw new Response("", { status: 401 });
          },
          element: <div />,
        },
        {
          path: "action",
          loader: () => "PARENT",
          element: <ACTION_ELEMENT />,
          children: [
            {
              path: "child-catch",
              loader: () => "CHILD",
              action: () => {
                throw new Response("Caught!", { status: 400 });
              },
              element: <CHILD_ACTION_ELEMENT />,
              errorElement: <ACTIONS_CHILD_CATCH_ERROR_ELEMENT />,
            },
          ],
        },
      ],
    },
  ]);

  test("non-matching urls on document requests", async () => {
    render(<RemixStub initialEntries={[NOT_FOUND_HREF]} />);
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
    expect(screen.getByTestId(ROOT_BOUNDARY_ID)).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
    // There should be no loader data on the root route
    let expected = JSON.stringify([{ id: "root", pathname: "", params: {} }]);
    expect(screen.getByTestId(MATCHES_ID)).toHaveTextContent(expected);
  });

  test("non-matching urls on client transitions", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(NOT_FOUND_HREF));
    await userEvent.click(screen.getByTestId(NOT_FOUND_HREF));
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
    // Root loader data sticks around from previous load
    let expected = JSON.stringify([
      { id: "root", pathname: "", params: {}, data: { data: "ROOT LOADER" } },
    ]);
    expect(screen.getByTestId(MATCHES_ID)).toHaveTextContent(expected);
  });

  // test("own boundary, action, document request", async () => {
  //   let params = new URLSearchParams();
  //   let res = await fixture.postDocument(HAS_BOUNDARY_ACTION, params);
  //   expect(res.status).toBe(401);
  //   expect(await res.text()).toMatch(OWN_BOUNDARY_TEXT);
  // });

  test("own boundary, action, client transition from other route", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId(ACTION_BOUNDARY_ID));
  });

  test("own boundary, action, client transition from itself", async () => {
    render(<RemixStub initialEntries={[HAS_BOUNDARY_ACTION]} />, {
      hydrate: true,
    });
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId(ACTION_BOUNDARY_ID));
  });

  // test("bubbles to parent in action document requests", async () => {
  //   let params = new URLSearchParams();
  //   let res = await fixture.postDocument(NO_BOUNDARY_ACTION, params);
  //   expect(res.status).toBe(401);
  //   expect(await res.text()).toMatch(ROOT_BOUNDARY_TEXT);
  // });

  test("bubbles to parent in action script transitions from other routes", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
  });

  test("bubbles to parent in action script transitions from self", async () => {
    render(<RemixStub initialEntries={[NO_BOUNDARY_ACTION]} />, {
      hydrate: true,
    });
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_ACTION));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_ACTION));
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
  });

  test("own boundary, loader, document request", async () => {
    render(<RemixStub initialEntries={[HAS_BOUNDARY_LOADER]} />);
    await waitFor(() => screen.getByTestId(OWN_BOUNDARY_ID));
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
  });

  test("own boundary, loader, client transition", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(HAS_BOUNDARY_LOADER));
    await userEvent.click(screen.getByTestId(HAS_BOUNDARY_LOADER));
    await waitFor(() => screen.getByTestId(OWN_BOUNDARY_ID));
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
  });

  test("bubbles to parent in loader document requests", async () => {
    render(<RemixStub initialEntries={[NO_BOUNDARY_LOADER]} />);
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
    expect(screen.getByTestId(ROOT_BOUNDARY_ID)).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
  });

  test("bubbles to parent in loader transitions from other routes", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(NO_BOUNDARY_LOADER));
    await userEvent.click(screen.getByTestId(NO_BOUNDARY_LOADER));
    await waitFor(() => screen.getByTestId(ROOT_BOUNDARY_ID));
    expect(screen.getByTestId(ROOT_BOUNDARY_ID)).toHaveTextContent(
      ROOT_BOUNDARY_TEXT
    );
  });

  // test("uses correct catch boundary on server action errors", async () => {
  //   let app = new PlaywrightFixture(appFixture, page);
  //   await app.goto(`/action/child-catch`);
  //   expect(await app.getHtml("#parent-data")).toMatch("PARENT");
  //   expect(await app.getHtml("#child-data")).toMatch("CHILD");
  //   await page.click("button[type=submit]");
  //   await page.waitForSelector("#child-catch");
  //   // Preserves parent loader data
  //   expect(await app.getHtml("#parent-data")).toMatch("PARENT");
  //   expect(await app.getHtml("#child-catch")).toMatch("400");
  //   expect(await app.getHtml("#child-catch")).toMatch("Caught!");
  // });

  test("prefers parent catch when child loader also bubbles, document request", async () => {
    render(<RemixStub initialEntries={[`${HAS_BOUNDARY_LOADER}/child`]} />);
    await waitFor(() => screen.getByTestId(OWN_BOUNDARY_ID));
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
    expect(screen.getByTestId(STATUS_ID)).toHaveTextContent("401");
  });

  test("prefers parent catch when child loader also bubbles, client transition", async () => {
    render(<RemixStub />, { hydrate: true });
    await waitFor(() => screen.getByTestId(`${HAS_BOUNDARY_LOADER}/child`));
    await userEvent.click(screen.getByTestId(`${HAS_BOUNDARY_LOADER}/child`));
    await waitFor(() => screen.getByTestId(OWN_BOUNDARY_ID));
    expect(screen.getByTestId(OWN_BOUNDARY_ID)).toHaveTextContent(
      OWN_BOUNDARY_TEXT
    );
    expect(screen.getByTestId(STATUS_ID)).toHaveTextContent("401");
  });
});
