"use client";
import * as React from "react";
import { DataTable } from "@/registry/cojeev/ui/data-table";
import {
  Table,
  TableContainer,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/registry/cojeev/ui/table";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

export function TableExample({ variant = "ledger" }: ExampleProps) {
  const [selected, setSelected] = React.useState("");
  const [pinned, setPinned] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState("all");
  const [comparisonPage, setComparisonPage] = React.useState(0);
  const appearance =
    variant === "rich" || variant === "comparison" ? variant : "ledger";
  const records = [
    {
      id: "01",
      name: "Morning notes",
      description: "A quiet start, before the day begins.",
      status: "Draft",
      words: 230,
      updated: "Today",
    },
    {
      id: "02",
      name: "Reading list",
      description: "Books and essays to return to.",
      status: "Ready",
      words: 125,
      updated: "Today",
    },
    {
      id: "03",
      name: "Project ideas",
      description: "Small possibilities, still taking shape.",
      status: "Draft",
      words: 450,
      updated: "Yesterday",
    },
    {
      id: "04",
      name: "Weekend plan",
      description: "A little room for something different.",
      status: "Ready",
      words: 80,
      updated: "Yesterday",
    },
    {
      id: "05",
      name: "Small discoveries",
      description: "Useful things noticed along the way.",
      status: "Ready",
      words: 312,
      updated: "Monday",
    },
    {
      id: "06",
      name: "A blank page",
      description: "Your next thought starts here.",
      status: "Draft",
      words: 0,
      updated: "Monday",
    },
  ];
  const compared = records.slice(comparisonPage * 3, comparisonPage * 3 + 3);
  const status = (value: string) => (
    <span className="v-table__status" data-ready={value === "Ready"}>
      {value}
    </span>
  );
  return (
    <section className="v-table-demo" aria-label="Notebook records">
      <header className="v-table-demo__heading">
        <span className="v-table-demo__emblem" aria-hidden="true">
          <Icon name="notebook" />
        </span>
        <div>
          <small>FIELD NOTEBOOK / 06 RECORDS</small>
          <h3>
            {appearance === "comparison"
              ? "Look a little closer"
              : "A collection of small things"}
          </h3>
        </div>
        <span className="v-table-demo__count">{pinned.length} pinned</span>
      </header>
      <p className="v-table-demo__cue">
        {appearance === "comparison"
          ? "Compare three records side by side. Open one to inspect it."
          : appearance === "rich"
            ? "A little context for each record. Open it or pin it for later."
            : "A compact register. Sort a column, filter the collection or select a row."}
      </p>
      <div hidden={appearance === "comparison"}>
        <DataTable
          appearance={appearance === "rich" ? "rich" : "ledger"}
          data={records}
          getRowId={(row) => row.id}
          columns={[
            {
              id: "name",
              header: "Note",
              sortValue: (row) => row.name,
              cell: (row) => (
                <div className="v-table__record">
                  <span className="v-table__record-number">{row.id}</span>
                  <span>
                    <b>{row.name}</b>
                    {appearance === "rich" && <small>{row.description}</small>}
                  </span>
                </div>
              ),
            },
            {
              id: "status",
              header: "Status",
              sortValue: (row) => row.status,
              cell: (row) => (
                <>
                  {status(row.status)}
                  {appearance === "rich" && (
                    <small className="v-table__updated">{row.updated}</small>
                  )}
                </>
              ),
            },
            {
              id: "words",
              header: "Words",
              accessorKey: "words",
              numeric: true,
              sortValue: (row) => row.words,
            },
            ...(appearance === "rich"
              ? [
                  {
                    id: "actions",
                    header: "Actions",
                    cell: (row: (typeof records)[number]) => (
                      <div className="v-table__actions">
                        <Button
                          variant="outline"
                          size="sm"
                          data-stable-hit=""
                          aria-label={`Open ${row.name}`}
                          onClick={() => setSelected(row.name)}
                        >
                          Open
                          <Icon name="arrow-up-right" size="sm" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-stable-hit=""
                          aria-label={`${pinned.includes(row.id) ? "Unpin" : "Pin"} ${row.name}`}
                          aria-pressed={pinned.includes(row.id)}
                          onClick={() =>
                            setPinned((old) =>
                              old.includes(row.id)
                                ? old.filter((id) => id !== row.id)
                                : [...old, row.id],
                            )
                          }
                        >
                          <Icon name="bookmark" size="sm" />
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
          filters={[
            {
              id: "ready",
              label: "Ready",
              predicate: (row) => row.status === "Ready",
            },
            {
              id: "draft",
              label: "Draft",
              predicate: (row) => row.status === "Draft",
            },
          ]}
          pageSize={3}
          page={page}
          onPageChange={setPage}
          filter={filter}
          onFilterChange={setFilter}
          onRowClick={(row) => setSelected(row.name)}
          caption="Notebook records — sort, filter or select a note"
        />
      </div>
      {appearance === "comparison" && (
        <div className="v-table-demo__comparison">
          <TableContainer aria-label="Compare notebook records">
            <Table appearance="comparison">
              <TableCaption>
                Three records, side by side. Word counts include empty notes.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Record</TableHead>
                  {compared.map((row) => (
                    <TableHead key={row.id}>
                      <span className="v-table__record-number">{row.id}</span>
                      <b>{row.name}</b>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableHead scope="row">Purpose</TableHead>
                  {compared.map((row) => (
                    <TableCell key={row.id}>{row.description}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead scope="row">Status</TableHead>
                  {compared.map((row) => (
                    <TableCell key={row.id}>{status(row.status)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead scope="row">Words</TableHead>
                  {compared.map((row) => (
                    <TableCell key={row.id} numeric>
                      {row.words}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead scope="row">Updated</TableHead>
                  {compared.map((row) => (
                    <TableCell key={row.id}>{row.updated}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead scope="row">Inspect</TableHead>
                  {compared.map((row) => (
                    <TableCell key={row.id}>
                      <Button
                        variant="outline"
                        size="sm"
                        data-stable-hit=""
                        aria-label={`Open ${row.name}`}
                        onClick={() => setSelected(row.name)}
                      >
                        Open
                        <Icon name="arrow-up-right" size="sm" />
                      </Button>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <div className="v-table-demo__compare-nav">
            <Button
              variant="ghost"
              size="sm"
              data-stable-hit=""
              disabled={comparisonPage === 0}
              onClick={() => setComparisonPage(0)}
            >
              <Icon name="arrow-left" size="sm" />
              First three
            </Button>
            <span>
              Records {comparisonPage * 3 + 1}–{comparisonPage * 3 + 3} of 6
            </span>
            <Button
              variant="ghost"
              size="sm"
              data-stable-hit=""
              disabled={comparisonPage === 1}
              onClick={() => setComparisonPage(1)}
            >
              Next three
              <Icon name="arrow-right" size="sm" />
            </Button>
          </div>
        </div>
      )}
      <div
        className="v-table-demo__receipt"
        role="status"
        aria-label="Table feedback"
      >
        <Icon name={selected ? "notebook" : "pointer"} size="sm" />
        <span>
          {selected ? (
            <>
              <b>{selected}</b>
              <small>Local demonstration · record opened</small>
            </>
          ) : (
            "Select a record to inspect it here."
          )}
        </span>
      </div>
    </section>
  );
}

/** Compatibility example: the same Tables guide, without removing the public DataTable entry. */
export function DataTableExample(props: ExampleProps) {
  return <TableExample {...props} />;
}
