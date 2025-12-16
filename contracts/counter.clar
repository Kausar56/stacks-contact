(define-data-var count uint u0)

(define-read-only (get-count)
  (var-get count)
)

(
    define-public (increment)
    (
        begin(print u"Print")
        (ok (var-set count (+ (var-get count) u1)))
    )
)